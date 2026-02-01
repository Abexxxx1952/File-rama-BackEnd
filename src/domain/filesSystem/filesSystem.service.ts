import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UUID } from 'crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import { drive_v3 } from 'googleapis';
import { Observable } from 'rxjs';
import {
  FILES_REPOSITORY,
  FOLDERS_REPOSITORY,
  STATS_REPOSITORY,
  USERS_REPOSITORY,
} from '@/configs/providersTokens';
import { StatsRepository } from '../stats/repository/stats.repository';
import { UsersRepository } from '../users/repository/users.repository';
import { CreateFilePermissionsDto } from './dto/create-file-permissions';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FilesRepository } from './repository/files.repository';
import { FoldersRepository } from './repository/folders.repository';
import { FileTransferService } from './services/fileTransferService/fileTransferService';
import { FolderCommandService } from './services/folderCommandService/folderCommandService';
import { GoogleDriveClient } from './services/googleDriveClient/googleDriveClient';
import { PermissionsService } from './services/permissionsService/permissionsService';
import { DeleteMany } from './types/delete-many-params';
import { File } from './types/file';
import { FileUploadResult } from './types/file-upload-result';
import { FileSystemItemChangeResult } from './types/fileSystemItem-change-result';
import { Folder } from './types/folder';
import { updateMany } from './types/update-many-params';

@Injectable()
export class FilesSystemService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    @Inject(FILES_REPOSITORY)
    private readonly filesRepository: FilesRepository,
    @Inject(FOLDERS_REPOSITORY)
    private readonly foldersRepository: FoldersRepository,
    @Inject(STATS_REPOSITORY)
    private readonly statsRepository: StatsRepository,
    private readonly googleDriveClient: GoogleDriveClient,
    private readonly fileTransferService: FileTransferService,
    private readonly folderCommandService: FolderCommandService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async createFile(
    currentUserId: UUID,
    fileUploadId: string = '',
    request: FastifyRequest,
  ): Promise<FileUploadResult[]> {
    try {
      return await this.fileTransferService.createFile(
        currentUserId,
        fileUploadId,
        request,
      );
    } catch (error) {
      if (error?.errors[0]?.message) {
        this.mapGoogleError(error);
      }
      throw error;
    }
  }

  async createFolder(
    userId: UUID,
    createfolderDto: CreateFolderDto,
  ): Promise<Folder> {
    try {
      const folderName = await this.foldersRepository.handleFolderNameConflict(
        createfolderDto.parentFolderId,
        createfolderDto.folderName,
      );

      const folder = await this.foldersRepository.create({
        folderName,
        userId,
        parentFolderId: createfolderDto.parentFolderId || null,
      });

      await this.statsRepository.incrementFolderCount(userId);

      return folder;
    } catch (error) {
      throw error;
    }
  }

  async downloadFile(
    currentUserId: UUID,
    fileId: UUID,
    res: FastifyReply,
  ): Promise<void> {
    try {
      await this.fileTransferService.downloadFile(currentUserId, fileId, res);
    } catch (error) {
      if (error?.errors[0]?.message) {
        this.mapGoogleError(error);
      }
      throw error;
    }
  }

  async streamPublicFile(fileId: UUID, res: FastifyReply): Promise<void> {
    try {
      return await this.fileTransferService.streamPublicFile(fileId, res);
    } catch (error) {
      if (error?.errors[0]?.message) {
        this.mapGoogleError(error);
      }
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

  async updateFile(
    currentUserId: UUID,
    fileUpdateDto: UpdateFileDto,
  ): Promise<File> {
    try {
      const [user, userFiles] = await Promise.all([
        this.usersRepository.findById(currentUserId),
        this.filesRepository.findAllByCondition({ userId: currentUserId }),
      ]);

      const file = userFiles.find((file) => file.id === fileUpdateDto.fileId);

      if (!file) {
        throw new NotFoundException("File doesn't exist");
      }

      const driveService = await this.googleDriveClient.getDrive(
        user,
        file.fileGoogleDriveClientEmail,
      );

      const requestBody: drive_v3.Schema$File = {};
      const dtoCopy: UpdateFileDto & { fileExtension?: string | null } = {
        ...fileUpdateDto,
      };

      const nameResult = await this.filesRepository.resolveFileName(
        fileUpdateDto,
        file.fileName,
        file.parentFolderId,
      );

      if (nameResult) {
        requestBody.name = nameResult;
        dtoCopy.fileName = nameResult;
        const extensionResult = this.filesRepository.getExtension(nameResult);
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
      if (error?.errors[0]?.message) {
        this.mapGoogleError(error);
      }
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

              const nameResult = await this.filesRepository.resolveFileName(
                fileToUpdate,
                file.fileName,
                file.parentFolderId,
              );

              if (nameResult) {
                requestBody.name = nameResult;
                fileToUpdateCopy.fileName = nameResult;
                const extensionResult =
                  this.filesRepository.getExtension(nameResult);
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
        if (error?.errors[0]?.message) {
          this.mapGoogleError(error);
        }
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
      if (error?.errors[0]?.message) {
        this.mapGoogleError(error);
      }
      throw error;
    }
  }

  async deleteFile(currentUserId: UUID, fileId: string): Promise<File> {
    let driveService: drive_v3.Drive;
    try {
      const [user, userFiles] = await Promise.all([
        this.usersRepository.findById(currentUserId),
        this.filesRepository.findAllByCondition({ userId: currentUserId }),
      ]);

      const file = userFiles.find((file) => file.id === fileId);

      if (!file) {
        throw new NotFoundException("File doesn't exist");
      }

      driveService = await this.googleDriveClient.getDrive(
        user,
        file.fileGoogleDriveClientEmail,
      );

      const response = await driveService.files.delete({
        fileId: file.fileGoogleDriveId,
      });

      if (response.status === 204) {
        await this.statsRepository.decrementFolderCount(user.id);
        return await this.filesRepository.deleteById(file.id);
      }
    } catch (error) {
      if (error?.errors[0]?.message) {
        this.mapGoogleError(error);
      }
      throw error;
    }
  }

  async deleteFolder(
    currentUserId: UUID,
    folderId: UUID,
  ): Promise<FileSystemItemChangeResult[]> {
    try {
      const [user, userFolders] = await Promise.all([
        this.usersRepository.findById(currentUserId),
        this.foldersRepository.findAllByCondition({ userId: currentUserId }),
      ]);

      const folder = userFolders.find((folder) => folder.id === folderId);

      if (!folder) {
        throw new NotFoundException("Folder doesn't exist");
      }

      const result = await this.folderCommandService.deleteFolderRecursively(
        currentUserId,
        folderId,
        user,
      );

      await this.statsRepository.decrementStats(currentUserId, {
        folderCount: result.deletedFoldersAll.length,
        fileCount: result.deletedFilesAll.length,
      });

      return result.result;
    } catch (error) {
      throw error;
    }
  }

  async deleteMany(
    currentUserId: UUID,
    deleteManyDto: DeleteMany,
  ): Promise<FileSystemItemChangeResult[]> {
    let driveService: drive_v3.Drive;
    let result: FileSystemItemChangeResult[] = [];
    let deletedFilesAll: File[] = [];
    let deletedFoldersAll: Folder[] = [];
    const files: Map<string, { fileId: string; fileGoogleDriveId: string }[]> =
      new Map();
    const folders: string[] = [];
    const filesToDeleteFromDB: string[] = [];

    try {
      const [user, userFiles, userFolders] = await Promise.all([
        this.usersRepository.findById(currentUserId),
        this.filesRepository.findAllByCondition({ userId: currentUserId }),
        this.foldersRepository.findAllByCondition({ userId: currentUserId }),
      ]);

      deleteManyDto.forEach((fileSystemItemToDelete) => {
        let coincidence = false;

        if ('fileId' in fileSystemItemToDelete) {
          const existFile = userFiles.find((file) => {
            return file.id === fileSystemItemToDelete.fileId;
          });

          if (existFile) {
            const mapValue = files.get(existFile.fileGoogleDriveClientEmail)
              ? files.get(existFile.fileGoogleDriveClientEmail).concat({
                  fileId: existFile.id,
                  fileGoogleDriveId: existFile.fileGoogleDriveId,
                })
              : [
                  {
                    fileId: existFile.id,
                    fileGoogleDriveId: existFile.fileGoogleDriveId,
                  },
                ];
            files.set(existFile.fileGoogleDriveClientEmail, mapValue);

            coincidence = true;
          }
        }

        if ('folderId' in fileSystemItemToDelete) {
          const existFolder = userFolders.find((folder) => {
            return folder.id === fileSystemItemToDelete.folderId;
          });

          if (existFolder) {
            folders.push(existFolder.id);
            coincidence = true;
          }
        }
        if (!coincidence) {
          if ('fileId' in fileSystemItemToDelete) {
            result.push({
              fileId: fileSystemItemToDelete.fileId,
              status: 'error',
            });
          }
          if ('folderId' in fileSystemItemToDelete) {
            result.push({
              folderId: fileSystemItemToDelete.folderId,
              status: 'error',
            });
          }
        }
      });

      if (files.size > 0) {
        for (const [key, value] of files) {
          let executeDeleteFiles: Promise<void>[];

          driveService = await this.googleDriveClient.getDrive(user, key);

          executeDeleteFiles = value.map(async (fileToDelete) => {
            try {
              const response = await driveService.files.delete({
                fileId: fileToDelete.fileGoogleDriveId,
              });

              if (response.status === 204) {
                filesToDeleteFromDB.push(fileToDelete.fileId);
              }
            } catch (error) {
              result.push({
                fileId: fileToDelete.fileId,
                status: 'error',
              });
            }
          });
          await Promise.allSettled(executeDeleteFiles);
        }

        const deletedFiles =
          await this.filesRepository.deleteManyById(filesToDeleteFromDB);

        deletedFiles.forEach((deletedFile) => {
          result.push({
            fileId: deletedFile.id,
            status: 'success',
          });
        });
        deletedFilesAll = deletedFilesAll.concat(deletedFiles);

        if (deletedFiles.length < filesToDeleteFromDB.length) {
          filesToDeleteFromDB.forEach((folderIdToDelete) => {
            const deletedFolder = deletedFiles.some((deletedFolder) => {
              deletedFolder.id === folderIdToDelete;
            });

            if (!deletedFolder) {
              result.push({
                folderId: folderIdToDelete,
                status: 'error',
              });
            }
          });
        }
      }

      if (folders.length > 0) {
        const executeDeleteFolders: Promise<void>[] = folders.map(
          async (folderId) => {
            const recursiveResult =
              await this.folderCommandService.deleteFolderRecursively(
                currentUserId,
                folderId,
                user,
              );

            result = result.concat(recursiveResult.result);
            deletedFilesAll = deletedFilesAll.concat(
              recursiveResult.deletedFilesAll,
            );
            deletedFoldersAll = deletedFoldersAll.concat(
              recursiveResult.deletedFoldersAll,
            );
          },
        );

        await Promise.allSettled(executeDeleteFolders);
      }

      await this.statsRepository.decrementStats(currentUserId, {
        fileCount: deletedFilesAll.length,
        folderCount: deletedFoldersAll.length,
      });

      return result;
    } catch (error) {
      if (error?.errors[0]?.message) {
        this.mapGoogleError(error);
      }
      throw error;
    }
  }

  async createFilePublicPermission(
    currentUserId: UUID,
    createFilePermissionsDto: CreateFilePermissionsDto,
  ): Promise<File> {
    try {
      return await this.permissionsService.createFilePublicPermission(
        currentUserId,
        createFilePermissionsDto,
      );
    } catch (error) {
      if (error?.errors[0]?.message) {
        this.mapGoogleError(error);
      }
      throw error;
    }
  }

  async deleteFilePublicPermissions(
    currentUserId: UUID,
    fileId: UUID,
  ): Promise<File> {
    try {
      return await this.permissionsService.deleteFilePublicPermissions(
        currentUserId,
        fileId,
      );
    } catch (error) {
      if (error?.errors[0]?.message) {
        this.mapGoogleError(error);
      }
      throw error;
    }
  }

  uploadProgress(
    currentUserId: UUID,
    fileUploadId: string = '',
  ): Observable<MessageEvent> {
    return this.fileTransferService.uploadProgress(currentUserId, fileUploadId);
  }

  private mapGoogleError(error: any): never {
    const message =
      error?.response?.data?.error?.message ||
      error?.errors?.[0]?.message ||
      'Google API error';

    switch (error?.response?.status) {
      case 403:
        throw new ForbiddenException(message);
      case 404:
        throw new NotFoundException(message);
      case 400:
        throw new BadRequestException(message);
      default:
        throw new InternalServerErrorException(message);
    }
  }
}
