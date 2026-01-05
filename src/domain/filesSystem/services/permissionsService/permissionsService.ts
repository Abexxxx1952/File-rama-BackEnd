import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { drive_v3 } from 'googleapis';
import { FILES_REPOSITORY, USERS_REPOSITORY } from '@/configs/providersTokens';
import { UsersRepository } from '@/domain/users/repository/users.repository';
import { CreateFilePermissionsDto } from '../../dto/create-file-permissions';
import { FilesRepository } from '../../repository/files.repository';
import { File } from '../../types/file';
import { GoogleDriveClient } from '../googleDriveClient/googleDriveClient';

@Injectable()
export class PermissionsService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    @Inject(FILES_REPOSITORY)
    private readonly filesRepository: FilesRepository,
    private readonly googleDriveClient: GoogleDriveClient,
  ) {}

  async createFilePublicPermission(
    currentUserId: UUID,
    createFilePermissionsDto: CreateFilePermissionsDto,
  ): Promise<File> {
    let driveService: drive_v3.Drive;
    try {
      const [user, file] = await Promise.all([
        this.usersRepository.findById(currentUserId),
        this.filesRepository.findById(createFilePermissionsDto.fileId),
      ]);

      if (file.userId !== user.id) {
        throw new ForbiddenException('You do not have access to this file');
      }

      if (file.isPublic && file.fileDownloadUrl) {
        return file;
      }

      driveService = await this.googleDriveClient.getDrive(
        user,
        file.fileGoogleDriveClientEmail,
      );

      await driveService.permissions.create({
        fileId: file.fileGoogleDriveId,
        requestBody: {
          role: createFilePermissionsDto.role,
          type: 'anyone',
        },
      });

      return await this.filesRepository.updateById(file.id, {
        isPublic: true,
      });
    } catch (error) {
      throw error;
    }
  }

  async deleteFilePublicPermissions(
    currentUserId: UUID,
    fileId: UUID,
  ): Promise<File> {
    let driveService: drive_v3.Drive;

    try {
      const [user, file] = await Promise.all([
        this.usersRepository.findById(currentUserId),
        this.filesRepository.findById(fileId),
      ]);

      if (file.userId !== user.id) {
        throw new ForbiddenException('You do not have access to this file');
      }

      if (!file.isPublic) {
        return file;
      }

      driveService = await this.googleDriveClient.getDrive(
        user,
        file.fileGoogleDriveClientEmail,
      );

      const permissions = await driveService.permissions.list({
        fileId: file.fileGoogleDriveId,
        fields: 'permissions(id, type)',
      });

      const publicPermissions = permissions.data.permissions?.filter(
        (permission) => permission.type === 'anyone',
      );

      if (publicPermissions?.length) {
        await Promise.all(
          publicPermissions.map((permission) =>
            driveService.permissions.delete({
              fileId: file.fileGoogleDriveId,
              permissionId: permission.id!,
            }),
          ),
        );
      }

      return await this.filesRepository.updateById(file.id, {
        isPublic: false,
      });
    } catch (error) {
      throw error;
    }
  }
}
