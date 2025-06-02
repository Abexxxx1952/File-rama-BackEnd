import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { EventEmitter } from 'events';
import { FastifyRequest } from 'fastify';
import { GaxiosResponse } from 'gaxios';
import { drive_v3, google } from 'googleapis';
import { Observable } from 'rxjs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { StatsRepository } from '../stats/repository/stats.repository';
import { UsersRepository } from '../users/repository/users.repository';
import { UserWithRelatedEntity } from '../users/types/user-with-related-entity';
import { User } from '../users/types/users';
import { CreateFilePermissionsDto } from './dto/create-file-permissions';
import { CreateFolderDto } from './dto/create-folder.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { FilesRepository } from './repository/files.repository';
import { FoldersRepository } from './repository/folders.repository';
import { emitterEventName } from './types/emitterEventName';
import { File } from './types/file';
import { FileUploadEvent, StatusUpload } from './types/file-upload-event';
import { FileUploadResult } from './types/file-upload-result';
import { FileWithRelatedEntity } from './types/file-with-related-entity';
import { Folder } from './types/folder';
import { NameConflictChoice } from './types/upload-name-conflict';

@Injectable()
export class FilesSystemService {
  private driveService: drive_v3.Drive;
  private readonly uploadEmitters = new Map<string, EventEmitter>();
  constructor(
    @Inject('UsersRepository')
    private readonly usersRepository: UsersRepository,
    @Inject('FilesRepository')
    private readonly filesRepository: FilesRepository,
    @Inject('FoldersRepository')
    private readonly foldersRepository: FoldersRepository,
    @Inject('StatsRepository')
    private readonly statsRepository: StatsRepository,
  ) {}

  async createFile(
    currentUserId: UUID,
    fileUploadId: string = '',
    request: FastifyRequest,
  ): Promise<FileUploadResult[]> {
    const pipelineAsync = promisify(pipeline);

    let description: string | null = null;
    let conflictChoice: NameConflictChoice;
    let parentFolderId: string | null = null;
    let parentFolderGoogleDriveId: string | null = null;
    const uploadResults: FileUploadResult[] = [];
    let userWithRelatedEntity: UserWithRelatedEntity;
    let about: GaxiosResponse;
    let user: User;
    let fileLoaded = false;
    let hasMoreFiles = false;
    const [emitter, key] = this.getOrCreateEmitter(currentUserId, fileUploadId);

    try {
      userWithRelatedEntity =
        await this.usersRepository.findByIdWithRelations<UserWithRelatedEntity>(
          currentUserId,
          ['stats'],
        );
    } catch (error) {
      throw error;
    }

    user = userWithRelatedEntity.users[0];

    if (!user.isVerified) {
      throw new ForbiddenException('User must be verified');
    }
    try {
      for (const account of user.googleServiceAccounts) {
        const { clientEmail, privateKey, rootFolderId = null } = account;

        await this.authenticate({ clientEmail, privateKey });

        try {
          about = await this.driveService.about.get({
            fields: 'storageQuota',
          });
        } catch (error) {
          continue;
        }

        const storageQuota = about.data.storageQuota;

        const totalSpace = Number(storageQuota.limit);
        const usedSpace = Number(storageQuota.usage);
        const availableSpace = totalSpace - usedSpace;

        const fileSize =
          parseInt(request.raw.headers['content-length'], 10) || 0;

        if (fileSize === 0) {
          throw new BadRequestException('File has no length');
        }

        if (availableSpace < fileSize) {
          continue;
        }

        for await (const part of request.parts()) {
          let fileName: string | null = null;
          let mimeType: string | null = null;
          if (part.type === 'field') {
            if (part.fieldname === 'description') {
              description = String(part.value);
            }
            if (part.fieldname === 'conflictChoice') {
              const value = String(part.value);
              if (
                Object.values(NameConflictChoice).includes(
                  value as NameConflictChoice,
                )
              ) {
                conflictChoice = value as NameConflictChoice;
              }
            }

            if (part.fieldname === 'parentFolderId') {
              parentFolderId = String(part.value);
            }
            if (part.fieldname === 'parentFolderGoogleDriveId') {
              parentFolderGoogleDriveId = String(part.value);
            }
          }

          if (part.type === 'file') {
            if (fileLoaded) {
              hasMoreFiles = true;
              continue;
            }

            fileName = part.filename;
            mimeType = part.mimetype;

            fileName = await this.handleNameConflict(
              'file',
              parentFolderId,
              fileName,
              conflictChoice,
            );

            let receivedBytes = 0;
            let lastSentProgress = 0;
            part.file.on('data', (chunk) => {
              receivedBytes += chunk.length;
              const progress = Math.round((receivedBytes / fileSize) * 100);
              if (progress > lastSentProgress) {
                lastSentProgress = progress;

                emitter.emit(emitterEventName.UPLOAD_PROGRESS, {
                  fileName,
                  progress: receivedBytes,
                  status: StatusUpload.UPLOADING,
                  error: null,
                });
              }
            });

            part.file.on('end', () => {
              emitter.emit(emitterEventName.UPLOAD_PROGRESS, {
                fileName,
                progress: receivedBytes,
                status: StatusUpload.COMPLETED,
                error: null,
              });
              setTimeout(() => this.uploadEmitters.delete(key), 5000);
            });

            part.file.on('error', (err) => {
              emitter.emit(emitterEventName.UPLOAD_PROGRESS, {
                fileName,
                progress: receivedBytes,
                status: StatusUpload.FAILED,
                error: err.message,
              });
            });

            await pipelineAsync(part.file, async (stream) => {
              const response = await this.driveService.files.create({
                requestBody: {
                  name: fileName,
                  mimeType: mimeType,
                  parents: parentFolderGoogleDriveId
                    ? [parentFolderGoogleDriveId]
                    : rootFolderId
                      ? [rootFolderId]
                      : ['root'],
                  description,
                },
                media: {
                  body: stream,
                },
                fields:
                  'id, webViewLink, webContentLink, size, createdTime, fileExtension, parents',
              });

              const file = await this.filesRepository.create({
                userId: user.id,
                fileUrl: response.data.webViewLink,
                fileDownloadUrl: response.data.webContentLink,
                fileName,
                fileExtension: response.data.fileExtension,
                fileSize: response.data.size,
                fileDescription: description,
                parentFolderId,
                fileGoogleDriveId: response.data.id,
                fileGoogleDriveParentFolderId: response.data.parents[0],
                fileGoogleDriveClientEmail: clientEmail,
                uploadDate: new Date(response.data.createdTime),
                isPublic: parentFolderGoogleDriveId ? true : false,
              });

              await this.statsRepository.updateByCondition(
                { userId: user.id },
                { fileCount: userWithRelatedEntity.stats[0].fileCount + 1 },
              );

              uploadResults.push({
                file,
                status: StatusUpload.COMPLETED,
                account: clientEmail,
              });
            });
            fileLoaded = true;
          }
        }
      }

      if (!fileLoaded) {
        throw new BadRequestException('File not loaded. No availableSpace');
      }
      if (hasMoreFiles) {
        uploadResults.push({
          fileName: 'Others files',
          status: StatusUpload.FAILED,
          error: 'Only one file can be uploaded at a time',
        });
      }

      return uploadResults;
    } catch (error) {
      if (error instanceof BadRequestException) {
        error.message = `Status: ${StatusUpload.FAILED} error: ${error.message}`;
        throw new BadRequestException(error.message);
      }
      if (error.errors[0].message) {
        throw new BadRequestException(error.errors[0].message);
      }
      throw error;
    }
  }

  async createFolder(
    userId: UUID,
    createfolderDto: CreateFolderDto,
  ): Promise<Folder> {
    try {
      const folderName = await this.handleNameConflict(
        'folder',
        createfolderDto.parentFolderId,
        createfolderDto.folderName,
      );

      const folder = await this.foldersRepository.create({
        folderName,
        userId: userId,
        parentFolderId: createfolderDto.parentFolderId,
      });

      const userStats = await this.statsRepository.findAllByCondition({
        userId,
      });

      await this.statsRepository.updateByCondition(
        { userId },
        { folderCount: userStats[0].folderCount + 1 },
      );

      return folder;
    } catch (error) {
      throw error;
    }
  }

  async findSlice(
    currentUserId: UUID,
    parentFolderId: string | null = null,
    offset?: number,
    limit?: number,
  ): Promise<(File | Folder)[]> {
    let folders: Folder[] = [];
    let files: File[] = [];

    try {
      folders = await this.foldersRepository.findAllByCondition({
        userId: currentUserId,
        parentFolderId,
      });
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw new InternalServerErrorException(error);
      }
    }

    try {
      files = await this.filesRepository.findAllByCondition({
        userId: currentUserId,
        parentFolderId,
      });
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw new InternalServerErrorException(error);
      }
    }
    const foldersAndFiles = [...folders, ...files];
    const start = offset !== undefined ? offset : 0;

    const end = limit !== undefined ? start + limit : foldersAndFiles.length;
    return foldersAndFiles.slice(start, end);
  }

  async deleteFile(currentUserId: UUID, fileId: string): Promise<File> {
    try {
      const userWithRelatedEntity =
        await this.usersRepository.findOneByConditionWithRelations<UserWithRelatedEntity>(
          { id: currentUserId },
          ['files', 'stats'],
        );

      const file = userWithRelatedEntity.files.find(
        (file) => file.id === fileId,
      );

      if (!file) {
        throw new NotFoundException("File doesn't exist");
      }

      const user = userWithRelatedEntity.users[0];
      const stats = userWithRelatedEntity.stats[0];
      const account = user.googleServiceAccounts.find((account) => {
        account.clientEmail === file.fileGoogleDriveClientEmail;
      });
      const { clientEmail, privateKey } = account;

      await this.authenticate({ clientEmail, privateKey });

      const response = await this.driveService.files.delete({
        fileId: file.fileGoogleDriveId,
      });

      if (response.status === 204) {
        await this.statsRepository.updateByCondition(
          { userId: user.id },
          { fileCount: stats.fileCount - 1 },
        );
        return await this.filesRepository.deleteById(file.id);
      }
    } catch (error) {
      throw error;
    }
  }

  async createFilePermissions(
    currentUserId: UUID,
    createFilePermissionsDto: CreateFilePermissionsDto,
  ): Promise<File> {
    try {
      const fileWithRelations =
        await this.filesRepository.findOneByConditionWithRelations<FileWithRelatedEntity>(
          {
            userId: currentUserId,
            id: createFilePermissionsDto.fileId,
          },
          ['user'],
        );

      const file = fileWithRelations.files[0];
      const user = fileWithRelations.users[0];

      const account = user.googleServiceAccounts.find((account) => {
        return account.clientEmail === file.fileGoogleDriveClientEmail;
      });

      const { clientEmail, privateKey } = account;

      await this.authenticate({ clientEmail, privateKey });
      await this.driveService.permissions.create({
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

  async deleteFilePermissions(
    currentUserId: UUID,
    fileId: UUID,
  ): Promise<File> {
    const fileWithRelations =
      await this.filesRepository.findOneByConditionWithRelations<FileWithRelatedEntity>(
        {
          userId: currentUserId,
          id: fileId,
        },
        ['user'],
      );
    const file = fileWithRelations.files[0];
    const user = fileWithRelations.users[0];

    const account = user.googleServiceAccounts.find((account) => {
      return account.clientEmail === file.fileGoogleDriveClientEmail;
    });
    const { clientEmail, privateKey } = account;

    await this.authenticate({ clientEmail, privateKey });

    const permissions = await this.driveService.permissions.list({
      fileId: file.fileGoogleDriveId,
    });

    const publicPermission = permissions.data.permissions.find(
      (permission) => permission.type === 'anyone',
    );

    if (publicPermission) {
      await this.driveService.permissions.delete({
        fileId: file.fileGoogleDriveId,
        permissionId: publicPermission.id,
      });
    }
    return await this.filesRepository.updateById(file.id, {
      isPublic: false,
    });
  }

  uploadProgress(
    currentUserId: UUID,
    fileUploadId: string = '',
  ): Observable<MessageEvent> {
    const [emitter] = this.getOrCreateEmitter(currentUserId, fileUploadId);

    emitter.removeAllListeners(emitterEventName.UPLOAD_PROGRESS);

    return new Observable((observer) => {
      const handler = (progress: FileUploadEvent) => {
        switch (progress.status) {
          case StatusUpload.UPLOADING:
            observer.next({
              data: progress,
            } as MessageEvent);
            break;
          case StatusUpload.COMPLETED:
            observer.next({
              data: progress,
            } as MessageEvent);
            emitter.off(emitterEventName.UPLOAD_PROGRESS, handler);
            observer.complete();
            break;
          case StatusUpload.FAILED:
            observer.error({
              data: progress,
            } as MessageEvent);
            emitter.off(emitterEventName.UPLOAD_PROGRESS, handler);
            observer.complete();
            break;
        }
      };
      emitter.on(emitterEventName.UPLOAD_PROGRESS, handler);

      return () => {
        emitter.off(emitterEventName.UPLOAD_PROGRESS, handler);
      };
    });
  }
  async authenticate(authDto: GoogleAuthDto): Promise<drive_v3.Drive> {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: authDto.clientEmail,
          private_key: authDto.privateKey.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

      this.driveService = google.drive({ version: 'v3', auth });

      return google.drive({ version: 'v3', auth });
    } catch (error) {
      throw error;
    }
  }
  async handleNameConflict(
    entity: 'file' | 'folder',
    parentFolderId: string | null,
    name: string,
    userChoice: NameConflictChoice = NameConflictChoice.RENAME,
  ): Promise<string> {
    let innerEntity: File | Folder;

    let uniqueName = name;

    try {
      entity === 'file'
        ? (innerEntity = await this.filesRepository.findOneByCondition({
            parentFolderId,
            fileName: uniqueName,
          }))
        : (innerEntity = await this.foldersRepository.findOneByCondition({
            parentFolderId,
            folderName: uniqueName,
          }));
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw new InternalServerErrorException(error);
      }
    }

    if (innerEntity) {
      if (userChoice === NameConflictChoice.RENAME) {
        let counter = 1;
        while (true) {
          if (entity === 'file') {
            const extension = uniqueName.split('.').pop() || '';
            const nameWithoutExtension = uniqueName.slice(
              0,
              -(extension.length ? extension.length + 1 : 0),
            );
            const baseName = nameWithoutExtension.replace(/\s\(\d+\)$/, '');
            uniqueName = `${baseName} (${counter}).${extension}`;
          } else {
            const baseName = uniqueName.replace(/\s\(\d+\)$/, '');
            uniqueName = `${baseName} (${counter})`;
          }

          counter++;
          try {
            entity === 'file'
              ? (innerEntity = await this.filesRepository.findOneByCondition({
                  parentFolderId,
                  fileName: uniqueName,
                }))
              : (innerEntity = await this.foldersRepository.findOneByCondition({
                  parentFolderId,
                  folderName: uniqueName,
                }));
          } catch (error) {
            if (!(error instanceof NotFoundException)) {
              throw new InternalServerErrorException(error);
            }
            innerEntity = null;
          }

          if (!innerEntity) {
            return uniqueName;
          }
        }
      }

      if (userChoice === NameConflictChoice.OVERWRITE) {
        try {
          entity === 'file'
            ? await this.filesRepository.deleteById(innerEntity.id)
            : await this.foldersRepository.deleteById(innerEntity.id);
        } catch (error) {
          throw error;
        }

        return uniqueName;
      }
    }

    return uniqueName;
  }
  catch(error) {
    throw new Error(`Failed to handle file conflict: ${error.message}`);
  }

  private getOrCreateEmitter(
    userId: string,
    fileUploadId: string,
  ): [EventEmitter, string] {
    const key = `${userId}-${fileUploadId}`;
    if (!this.uploadEmitters.has(key)) {
      const emitter = new EventEmitter();

      this.uploadEmitters.set(key, emitter);
    }

    return [this.uploadEmitters.get(key), key];
  }
}
