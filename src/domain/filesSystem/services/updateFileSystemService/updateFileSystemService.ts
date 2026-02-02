import { Inject, Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { drive_v3 } from 'googleapis';
import {
  FILES_REPOSITORY,
  FOLDERS_REPOSITORY,
  USERS_REPOSITORY,
} from '@/configs/providersTokens';
import { UsersRepository } from '@/domain/users/repository/users.repository';
import { UpdateFileDto } from '../../dto/update-file.dto';
import { UpdateFolderDto } from '../../dto/update-folder.dto';
import { FilesRepository } from '../../repository/files.repository';
import { FoldersRepository } from '../../repository/folders.repository';
import { File } from '../../types/file';
import { FileSystemItemChangeResult } from '../../types/fileSystemItem-change-result';
import { Folder } from '../../types/folder';
import { updateMany } from '../../types/update-many-params';
import { GoogleDriveClient } from '../googleDriveClient/googleDriveClient';

@Injectable()
export class UpdateFileSystemService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    @Inject(FILES_REPOSITORY)
    private readonly filesRepository: FilesRepository,
    @Inject(FOLDERS_REPOSITORY)
    private readonly foldersRepository: FoldersRepository,
    private readonly googleDriveClient: GoogleDriveClient,
  ) {}
  async updateFile(
    currentUserId: UUID,
    fileUpdateDto: UpdateFileDto,
  ): Promise<File> {
    try {
      const [user, file] = await Promise.all([
        this.usersRepository.findById(currentUserId),
        this.filesRepository.findOneByCondition({
          id: fileUpdateDto.fileId,
          userId: currentUserId,
        }),
      ]);

      const driveService = await this.googleDriveClient.getDrive(
        user,
        file.fileGoogleDriveClientEmail,
      );

      const requestBody: drive_v3.Schema$File = {};
      const dtoCopy: UpdateFileDto & { fileExtension?: string | null } = {
        ...fileUpdateDto,
      };

      const nameResult = await this.resolveFileName(
        fileUpdateDto,
        file.fileName,
        file.parentFolderId,
      );

      if (nameResult) {
        requestBody.name = nameResult;
        dtoCopy.fileName = nameResult;
        const extensionResult = this.getExtension(nameResult);
        if (extensionResult !== file.fileExtension) {
          dtoCopy.fileExtension = extensionResult;
        }
      }

      if (fileUpdateDto.fileDescription) {
        requestBody.description = fileUpdateDto.fileDescription;
      }

      if (Object.keys(requestBody).length > 0) {
        const response = await driveService.files.update({
          fileId: file.fileGoogleDriveId,
          requestBody,
        });

        if (![200, 204].includes(response.status)) {
          throw new Error('Drive update failed');
        }
      }

      return this.filesRepository.updateFile(currentUserId, dtoCopy);
    } catch (error) {
      throw error;
    }
  }

  async updateFolder(
    currentUserId: UUID,
    updateFolderDto: UpdateFolderDto,
  ): Promise<Folder> {
    try {
      const folder = await this.foldersRepository.findOneByCondition({
        userId: currentUserId,
        id: updateFolderDto.folderId,
      });

      const nameResult = await this.resolveFolderName(
        updateFolderDto,
        folder.folderName,
        folder.parentFolderId,
      );

      const dtoCopy: UpdateFolderDto = {
        ...updateFolderDto,
      };

      if (nameResult) {
        dtoCopy.folderName = nameResult;
      }

      return await this.foldersRepository.updateByCondition(
        { id: updateFolderDto.folderId, userId: currentUserId },
        dtoCopy,
      )[0];
    } catch (error) {
      throw error;
    }
  }

  async updateMany(
    currentUserId: UUID,
    updateManyDto: updateMany,
  ): Promise<FileSystemItemChangeResult[]> {
    let driveService: drive_v3.Drive;
    const result: FileSystemItemChangeResult[] = [];
    try {
      const [user, userFiles, userFolders] = await Promise.all([
        this.usersRepository.findById(currentUserId),
        this.filesRepository.findAllByCondition({ userId: currentUserId }),
        this.foldersRepository.findAllByCondition({ userId: currentUserId }),
        ,
      ]);
      const files: Map<
        string,
        (UpdateFileDto & {
          fileGoogleDriveClientEmail: string;
          fileGoogleDriveId: string;
        })[]
      > = new Map();

      const folders: UpdateFolderDto[] = [];
      const filesToUpdateFromDB: {
        id: string | number | UUID;
        data: Partial<File>;
      }[] = [];

      updateManyDto.forEach((fileSystemItemToUpdate) => {
        let coincidence = false;
        if ('fileId' in fileSystemItemToUpdate) {
          const existFile = userFiles.find((file) => {
            return file.id === fileSystemItemToUpdate.fileId;
          });
          if (existFile) {
            const fileObjToMap = {
              ...fileSystemItemToUpdate,
              fileGoogleDriveClientEmail: existFile.fileGoogleDriveClientEmail,
              fileGoogleDriveId: existFile.fileGoogleDriveId,
            };

            const mapValue = files.get(existFile.fileGoogleDriveClientEmail)
              ? files
                  .get(existFile.fileGoogleDriveClientEmail)
                  .concat(fileObjToMap)
              : [fileObjToMap];
            files.set(existFile.fileGoogleDriveClientEmail, mapValue);

            coincidence = true;
          }
        }
        if ('folderId' in fileSystemItemToUpdate) {
          const existFolder = userFolders.find((folder) => {
            return folder.id === fileSystemItemToUpdate.folderId;
          });
          if (existFolder) {
            folders.push(fileSystemItemToUpdate);
            coincidence = true;
          }
        }
        if (!coincidence) {
          if ('fileId' in fileSystemItemToUpdate) {
            result.push({
              fileId: fileSystemItemToUpdate.fileId,
              status: 'error',
            });
          }
          if ('folderId' in fileSystemItemToUpdate) {
            result.push({
              folderId: fileSystemItemToUpdate.folderId,
              status: 'error',
            });
          }
        }
      });

      if (files.size > 0) {
        for (const [clientEmail, filesToUpdate] of files) {
          let executeUpdateFiles: Promise<void>[];

          driveService = await this.googleDriveClient.getDrive(
            user,
            clientEmail,
          );

          executeUpdateFiles = filesToUpdate.map(async (fileToUpdate) => {
            try {
              const requestBody: drive_v3.Schema$File = {};

              const fileToUpdateCopy: UpdateFileDto & {
                fileExtension?: string | null;
                fileGoogleDriveClientEmail: string;
                fileGoogleDriveId: string;
              } = { ...fileToUpdate };

              const file = await this.filesRepository.findById(
                fileToUpdate.fileId,
              );

              const nameResult = await this.resolveFileName(
                fileToUpdate,
                file.fileName,
                file.parentFolderId,
              );

              if (nameResult) {
                requestBody.name = nameResult;
                fileToUpdateCopy.fileName = nameResult;
                const extensionResult = this.getExtension(nameResult);
                if (extensionResult !== file.fileExtension) {
                  fileToUpdateCopy.fileExtension = extensionResult;
                }
              }

              if (fileToUpdateCopy.fileDescription) {
                requestBody.description = fileToUpdateCopy.fileDescription;
              }

              const shouldUpdateDrive = Object.keys(requestBody).length > 0;

              if (shouldUpdateDrive) {
                const response = await driveService.files.update({
                  fileId: file.fileGoogleDriveId,
                  requestBody,
                });

                if (![200, 204].includes(response.status)) {
                  throw new Error('Drive update failed');
                }
              }

              if (
                shouldUpdateDrive ||
                fileToUpdate.parentFolderId ||
                fileToUpdate.parentFolderId === null
              ) {
                const {
                  fileGoogleDriveClientEmail,
                  fileGoogleDriveId,
                  fileId,
                  ...rest
                } = fileToUpdateCopy;

                filesToUpdateFromDB.push({
                  id: fileToUpdate.fileId,
                  data: rest,
                });
              }
            } catch (error) {
              result.push({
                fileId: fileToUpdate.fileId,
                status: 'error',
              });
            }
          });
          await Promise.allSettled(executeUpdateFiles);
        }
      }

      try {
        const updatesFiles =
          await this.filesRepository.updateManyById(filesToUpdateFromDB);

        updatesFiles.forEach((updatesFile) => {
          result.push({
            fileId: updatesFile.id,
            status: 'success',
          });
        });
      } catch (error) {
        throw error;
      }

      if (folders.length > 0) {
        const foldersToUpdateFromDB: {
          id: string | number | UUID;
          data: Partial<Folder>;
        }[] = [];

        for (const folderToUpdate of folders) {
          const { folderId, ...rest } = folderToUpdate;
          let folderName: string | null = null;

          const folder = await this.foldersRepository.findById(folderId);

          if (
            folderToUpdate.parentFolderId ||
            folderToUpdate.parentFolderId === null
          ) {
            folderName = await this.foldersRepository.handleFolderNameConflict(
              folderToUpdate.parentFolderId,
              folderToUpdate.folderName
                ? folderToUpdate.folderName
                : folder.folderName,
            );
            if (folderName !== folder.folderName) {
              rest.folderName = folderName;
            }
          }

          if (folderToUpdate.folderName && !folderName) {
            folderName = await this.foldersRepository.handleFolderNameConflict(
              folder.parentFolderId,
              folderToUpdate.folderName,
            );
            if (folderName !== folder.folderName) {
              rest.folderName = folderName;
            }
          }
          foldersToUpdateFromDB.push({
            id: folderId,
            data: rest,
          });
        }
        const updatedFolder = await this.foldersRepository.updateManyById(
          foldersToUpdateFromDB,
        );
        updatedFolder.forEach((folder) => {
          result.push({
            folderId: folder.id,
            status: 'success',
          });
        });
        if (updatedFolder.length < folders.length) {
          folders.forEach(({ folderId }) => {
            const deletedFolder = updatedFolder.some((deletedFolder) => {
              deletedFolder.id === folderId;
            });

            if (!deletedFolder) {
              result.push({
                folderId: folderId,
                status: 'error',
              });
            }
          });
        }
      }
      return result;
    } catch (error) {
      throw error;
    }
  }

  private async resolveFileName(
    dto: UpdateFileDto,
    fileName: string,
    fileParentFolderId: string | null,
  ): Promise<string | null> {
    const targetParentId =
      dto.parentFolderId !== undefined
        ? dto.parentFolderId
        : fileParentFolderId;

    const targetName = dto.fileName ?? fileName;

    const resolvedName = await this.filesRepository.handleFileNameConflict(
      targetParentId,
      targetName,
    );

    if (resolvedName === fileName) {
      return null;
    }

    return resolvedName;
  }

  private async resolveFolderName(
    dto: UpdateFolderDto,
    folderName: string,
    folderParentFolderId: string | null,
  ): Promise<string | null> {
    const targetParentId =
      dto.parentFolderId !== undefined
        ? dto.parentFolderId
        : folderParentFolderId;

    const targetName = dto.folderName ?? folderName;

    const resolvedName = await this.foldersRepository.handleFolderNameConflict(
      targetParentId,
      targetName,
    );

    if (resolvedName === folderName) {
      return null;
    }

    return resolvedName;
  }

  private getExtension(fileName: string): string | null {
    const lastDot = fileName.lastIndexOf('.');

    if (lastDot <= 0 || lastDot === fileName.length - 1) {
      return null;
    }

    return fileName.slice(lastDot + 1);
  }
}
