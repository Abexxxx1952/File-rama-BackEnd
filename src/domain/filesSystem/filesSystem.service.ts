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
import { EventEmitter } from 'events';
import { FastifyReply, FastifyRequest } from 'fastify';
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
import { UpdateFileDto } from './dto/update-file.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { UpdateManyDto } from './dto/update-many.dto';
import { FilesRepository } from './repository/files.repository';
import { FoldersRepository } from './repository/folders.repository';
import { DeleteFolderRecursivelyResult } from './types/delete-folder-recursively-result';
import { DeleteMany } from './types/delete-many-params';
import { emitterEventName } from './types/emitterEventName';
import { File } from './types/file';
import { FileUploadEvent, UploadStatus } from './types/file-upload-event';
import { FileUploadResult } from './types/file-upload-result';
import { FileWithRelatedEntity } from './types/file-with-related-entity';
import { FileSystemItemChangeResult } from './types/fileSystemItem-change-result';
import { Folder } from './types/folder';
import { NameConflictChoice } from './types/upload-name-conflict';

@Injectable()
export class FilesSystemService {
  private driveService: drive_v3.Drive;
  private readonly uploadEmitters = new Map<string, EventEmitter>();
  private activeUploads = new Map<string, number>();
  private readonly maxUploadsPerUser = this.configService.getOrThrow<number>(
    'MAX_UPLOADS_PER_USER',
  );
  constructor(
    private readonly configService: ConfigService,
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

    const allowed = this.startUpload(currentUserId);

    if (!allowed) {
      throw new BadRequestException('Parallel download limit exceeded');
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

            fileName = await this.handleFileNameConflict(
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
                  status: UploadStatus.UPLOADING,
                  error: null,
                });
              }
            });

            part.file.on('end', () => {
              emitter.emit(emitterEventName.UPLOAD_PROGRESS, {
                fileName,
                progress: receivedBytes,
                status: UploadStatus.COMPLETED,
                error: null,
              });
              setTimeout(() => this.uploadEmitters.delete(key), 5000);
            });

            part.file.on('error', (err) => {
              emitter.emit(emitterEventName.UPLOAD_PROGRESS, {
                fileName,
                progress: receivedBytes,
                status: UploadStatus.FAILED,
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
                status: UploadStatus.COMPLETED,
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
          status: UploadStatus.FAILED,
          error: 'Only one file can be uploaded at a time',
        });
      }

      return uploadResults;
    } catch (error) {
      if (error instanceof BadRequestException) {
        error.message = `Status: ${UploadStatus.FAILED} error: ${error.message}`;
        throw new BadRequestException(error.message);
      }
      if (error.errors[0].message) {
        throw new BadRequestException(error.errors[0].message);
      }
      throw error;
    } finally {
      this.finishUpload(currentUserId);
    }
  }

  async createFolder(
    userId: UUID,
    createfolderDto: CreateFolderDto,
  ): Promise<Folder> {
    try {
      const folderName = await this.handleFolderNameConflict(
        createfolderDto.parentFolderId,
        createfolderDto.folderName,
      );

      const folder = await this.foldersRepository.create({
        folderName,
        userId,
        parentFolderId: createfolderDto.parentFolderId || null,
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

  async downloadFile(
    currentUserId: UUID,
    fileId: UUID,
    res: FastifyReply,
  ): Promise<never> {
    try {
      const userWithRelatedEntity =
        await this.usersRepository.findOneByConditionWithRelations<UserWithRelatedEntity>(
          { id: currentUserId },
          ['files'],
        );

      const file = userWithRelatedEntity.files.find(
        (file) => file.id === fileId,
      );

      if (!file) {
        throw new NotFoundException("File doesn't exist");
      }
      const user = userWithRelatedEntity.users[0];

      const account = user.googleServiceAccounts.find((account) => {
        return account.clientEmail === file.fileGoogleDriveClientEmail;
      });

      const { clientEmail, privateKey } = account;

      await this.authenticate({ clientEmail, privateKey });

      const meta = await this.driveService.files.get({
        fileId: file.fileGoogleDriveId,
        fields: 'name, mimeType',
      });

      if (!meta.data.name) {
        throw new NotFoundException('File not found');
      }

      const fileName = meta.data.name;
      const mimeType = meta.data.mimeType || 'application/octet-stream';

      const fileStream = await this.driveService.files.get(
        {
          fileId: file.fileGoogleDriveId,
          alt: 'media',
        },
        { responseType: 'stream' },
      );

      res.header('Content-Type', mimeType);
      res.header(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileName)}"`,
      );
      res.header('Content-Length', fileStream.headers['content-length']);
      res.header('Access-Control-Expose-Headers', 'Content-Disposition');

      return res.send(fileStream.data);
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

  async updateFile(
    currentUserId: UUID,
    fileUpdateDto: UpdateFileDto,
  ): Promise<File> {
    try {
      const userWithRelatedEntity =
        await this.usersRepository.findOneByConditionWithRelations<UserWithRelatedEntity>(
          { id: currentUserId },
          ['files'],
        );

      const file = userWithRelatedEntity.files.find(
        (file) => file.id === fileUpdateDto.fileId,
      );

      if (!file) {
        throw new NotFoundException("File doesn't exist");
      }

      const user = userWithRelatedEntity.users[0];

      const account = user.googleServiceAccounts.find((account) => {
        return account.clientEmail === file.fileGoogleDriveClientEmail;
      });

      const { clientEmail, privateKey } = account;

      await this.authenticate({ clientEmail, privateKey });

      const requestBody: drive_v3.Schema$File = {};

      if (fileUpdateDto.fileName) {
        requestBody.name = fileUpdateDto.fileName;
      }

      if (fileUpdateDto.fileDescription) {
        requestBody.description = fileUpdateDto.fileDescription;
      }

      const response = await this.driveService.files.update({
        fileId: file.fileGoogleDriveId,
        requestBody,
      });

      if (response.status === 204 || response.status === 200) {
        const updatedFile = await this.filesRepository.updateFile(
          currentUserId,
          fileUpdateDto,
        );

        return updatedFile;
      }
    } catch (error) {
      throw error;
    }
  }

  async updateMany(
    currentUserId: UUID,
    updateManyDto: UpdateManyDto[],
  ): Promise<FileSystemItemChangeResult[]> {
    const result: FileSystemItemChangeResult[] = [];
    try {
      const userWithRelatedEntity =
        await this.usersRepository.findOneByConditionWithRelations<UserWithRelatedEntity>(
          { id: currentUserId },
          ['files', 'folders'],
        );
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
          const existFile = userWithRelatedEntity.files.find((file) => {
            return file.id === fileSystemItemToUpdate.fileId;
          });
          if (existFile) {
            const mapValue = files.get(existFile.fileGoogleDriveClientEmail)
              ? files.get(existFile.fileGoogleDriveClientEmail).concat({
                  ...fileSystemItemToUpdate,
                  fileGoogleDriveClientEmail:
                    existFile.fileGoogleDriveClientEmail,
                  fileGoogleDriveId: existFile.fileGoogleDriveId,
                })
              : [
                  {
                    ...fileSystemItemToUpdate,
                    fileGoogleDriveClientEmail:
                      existFile.fileGoogleDriveClientEmail,
                    fileGoogleDriveId: existFile.fileGoogleDriveId,
                  },
                ];
            files.set(existFile.fileGoogleDriveClientEmail, mapValue);

            coincidence = true;
          }
        }
        if ('folderId' in fileSystemItemToUpdate) {
          const existFolder = userWithRelatedEntity.folders.find((folder) => {
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

      const user = userWithRelatedEntity.users[0];
      if (files.size > 0) {
        for (const [key, value] of files) {
          let executeUpdateFiles: Promise<void>[];
          const account = user.googleServiceAccounts.find((account) => {
            return account.clientEmail === key;
          });
          const { clientEmail, privateKey } = account;
          await this.authenticate({ clientEmail, privateKey });
          executeUpdateFiles = value.map(async (fileToUpdate) => {
            try {
              const requestBody: drive_v3.Schema$File = {};

              if (fileToUpdate.fileName) {
                requestBody.name = fileToUpdate.fileName;
              }

              if (fileToUpdate.fileDescription) {
                requestBody.description = fileToUpdate.fileDescription;
              }

              const response = await this.driveService.files.update({
                fileId: fileToUpdate.fileGoogleDriveId,
                requestBody,
              });

              if (response.status === 204 || response.status === 200) {
                const {
                  fileGoogleDriveClientEmail,
                  fileGoogleDriveId,
                  fileId,
                  ...rest
                } = fileToUpdate;
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

      const updatesFiles =
        await this.filesRepository.updateManyById(filesToUpdateFromDB);
      updatesFiles.forEach((updatesFile) => {
        result.push({
          fileId: updatesFile.id,
          status: 'success',
        });
      });

      if (folders.length > 0) {
        const foldersToUpdateFromDB: {
          id: string | number | UUID;
          data: Partial<Folder>;
        }[] = folders.map((folderToUpdate) => {
          const { folderId, ...rest } = folderToUpdate;
          return {
            id: folderId,
            data: rest,
          };
        });
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
        return account.clientEmail === file.fileGoogleDriveClientEmail;
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

  async deleteFolder(
    currentUserId: UUID,
    folderId: UUID,
  ): Promise<FileSystemItemChangeResult[]> {
    try {
      const userWithRelatedEntity =
        await this.usersRepository.findOneByConditionWithRelations<UserWithRelatedEntity>(
          { id: currentUserId },
          ['folders', 'stats'],
        );

      const folder = userWithRelatedEntity.folders.find(
        (folder) => folder.id === folderId,
      );

      if (!folder) {
        throw new NotFoundException("Folder doesn't exist");
      }

      const userStat = userWithRelatedEntity.stats[0];

      const result = await this.deleteFolderRecursively(
        currentUserId,
        folderId,
        userWithRelatedEntity.users[0].googleServiceAccounts,
      );

      await this.statsRepository.updateByCondition(
        { userId: currentUserId },
        {
          folderCount: userStat.folderCount - result.deletedFoldersAll.length,
          fileCount: userStat.fileCount - result.deletedFilesAll.length,
        },
      );

      return result.result;
    } catch (error) {
      throw error;
    }
  }

  async deleteMany(
    currentUserId: UUID,
    deleteManyDto: DeleteMany,
  ): Promise<FileSystemItemChangeResult[]> {
    let result: FileSystemItemChangeResult[] = [];
    let deletedFilesAll: File[] = [];
    let deletedFoldersAll: Folder[] = [];
    const files: Map<string, { fileId: string; fileGoogleDriveId: string }[]> =
      new Map();
    const folders: string[] = [];
    const filesToDeleteFromDB: string[] = [];

    try {
      const userWithRelatedEntity =
        await this.usersRepository.findOneByConditionWithRelations<UserWithRelatedEntity>(
          { id: currentUserId },
          ['files', 'folders', 'stats'],
        );

      deleteManyDto.forEach((fileSystemItemToDelete) => {
        let coincidence = false;

        if ('fileId' in fileSystemItemToDelete) {
          const existFile = userWithRelatedEntity.files.find((file) => {
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
          const existFolder = userWithRelatedEntity.folders.find((folder) => {
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

      const user = userWithRelatedEntity.users[0];
      const stats = userWithRelatedEntity.stats[0];
      if (files.size > 0) {
        for (const [key, value] of files) {
          let executeDeleteFiles: Promise<void>[];

          const account = user.googleServiceAccounts.find((account) => {
            return account.clientEmail === key;
          });

          const { clientEmail, privateKey } = account;

          await this.authenticate({ clientEmail, privateKey });

          executeDeleteFiles = value.map(async (fileToDelete) => {
            try {
              const response = await this.driveService.files.delete({
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
            const recursiveResult = await this.deleteFolderRecursively(
              currentUserId,
              folderId,
              user.googleServiceAccounts,
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

      await this.statsRepository.updateByCondition(
        { userId: currentUserId },
        {
          fileCount: stats.fileCount - deletedFilesAll.length,
          folderCount: stats.folderCount - deletedFoldersAll.length,
        },
      );

      return result;
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
          case UploadStatus.UPLOADING:
            observer.next({
              data: progress,
            } as MessageEvent);
            break;
          case UploadStatus.COMPLETED:
            observer.next({
              data: progress,
            } as MessageEvent);
            emitter.off(emitterEventName.UPLOAD_PROGRESS, handler);
            observer.complete();
            break;
          case UploadStatus.FAILED:
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

  private async handleFileNameConflict(
    parentFolderId: string | null,
    name: string,
    userChoice: NameConflictChoice = NameConflictChoice.RENAME,
  ): Promise<string> {
    let innerEntity: File;

    let uniqueName = name;
    try {
      try {
        innerEntity = await this.filesRepository.findOneByCondition({
          parentFolderId,
          fileName: uniqueName,
        });
      } catch (error) {
        if (!(error instanceof NotFoundException)) {
          throw new InternalServerErrorException(error, { cause: error });
        }
      }

      if (innerEntity) {
        if (userChoice === NameConflictChoice.RENAME) {
          let counter = 1;
          while (true) {
            const extension = uniqueName.split('.').pop() || '';
            const nameWithoutExtension = uniqueName.slice(
              0,
              -(extension.length ? extension.length + 1 : 0),
            );
            const baseName = nameWithoutExtension.replace(/\s\(\d+\)$/, '');
            uniqueName = `${baseName} (${counter}).${extension}`;

            counter++;
            try {
              innerEntity = await this.filesRepository.findOneByCondition({
                parentFolderId,
                fileName: uniqueName,
              });
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
            await this.filesRepository.deleteById(innerEntity.id);
          } catch (error) {
            throw error;
          }

          return uniqueName;
        }
      }

      return uniqueName;
    } catch (error) {
      throw new Error(`Failed to handle file conflict: ${error.message}`);
    }
  }

  private async handleFolderNameConflict(
    parentFolderId: string | null,
    name: string,
    userChoice: NameConflictChoice = NameConflictChoice.RENAME,
  ): Promise<string> {
    let innerEntity: File | Folder;

    let uniqueName = name;
    try {
      try {
        innerEntity = await this.foldersRepository.findOneByCondition({
          parentFolderId,
          folderName: uniqueName,
        });
      } catch (error) {
        if (!(error instanceof NotFoundException)) {
          throw new InternalServerErrorException(error);
        }
      }

      if (innerEntity) {
        if (userChoice === NameConflictChoice.RENAME) {
          let counter = 1;
          while (true) {
            const baseName = uniqueName.replace(/\s\(\d+\)$/, '');
            uniqueName = `${baseName} (${counter})`;

            counter++;
            try {
              innerEntity = await this.foldersRepository.findOneByCondition({
                parentFolderId,
                folderName: uniqueName,
              });
            } catch (error) {
              if (!(error instanceof NotFoundException)) {
                throw new InternalServerErrorException(error, { cause: error });
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
            await this.foldersRepository.deleteById(innerEntity.id);
          } catch (error) {
            throw error;
          }

          return uniqueName;
        }
      }

      return uniqueName;
    } catch (error) {
      throw new Error(`Failed to handle file conflict: ${error.message}`, {
        cause: error,
      });
    }
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

  private startUpload(userId: string): boolean {
    const current = this.activeUploads.get(userId) || 0;

    if (current >= this.maxUploadsPerUser) {
      return false;
    }

    this.activeUploads.set(userId, current + 1);
    return true;
  }

  private finishUpload(userId: string) {
    const current = this.activeUploads.get(userId) || 0;
    if (current <= 1) {
      this.activeUploads.delete(userId);
    }
    this.activeUploads.set(userId, current - 1);
  }

  private async deleteFolderRecursively(
    currentUserId: UUID,
    folderId: string,
    userGoogleServiceAccounts: {
      clientEmail: string;
      privateKey: string;
      rootFolderId?: string;
    }[],
  ): Promise<DeleteFolderRecursivelyResult> {
    let files: File[];
    let subFolders: Folder[];
    let result: FileSystemItemChangeResult[] = [];
    const filesToDeleteFromDB: string[] = [];
    let deletedFilesAll: File[] = [];
    let deletedFoldersAll: Folder[] = [];
    try {
      try {
        files = await this.filesRepository.findAllByCondition({
          userId: currentUserId,
          parentFolderId: folderId,
        });
      } catch (error) {
        if (error instanceof NotFoundException) {
          files = [];
        } else {
          throw error;
        }
      }
      if (files.length > 0) {
        const filesMap: Map<
          string,
          { fileId: string; fileGoogleDriveId: string }[]
        > = new Map();
        files.forEach((file) => {
          const mapValue = filesMap.get(file.fileGoogleDriveClientEmail)
            ? filesMap.get(file.fileGoogleDriveClientEmail).concat({
                fileId: file.id,
                fileGoogleDriveId: file.fileGoogleDriveId,
              })
            : [
                {
                  fileId: file.id,
                  fileGoogleDriveId: file.fileGoogleDriveId,
                },
              ];
          filesMap.set(file.fileGoogleDriveClientEmail, mapValue);
        });

        for (const [key, value] of filesMap) {
          const account = userGoogleServiceAccounts.find((account) => {
            return account.clientEmail === key;
          });

          const { clientEmail, privateKey } = account;

          await this.authenticate({ clientEmail, privateKey });

          const executeDeleteFiles: Promise<void>[] = value.map(
            async (fileToDelete) => {
              try {
                const response = await this.driveService.files.delete({
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
            },
          );
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

      try {
        subFolders = await this.foldersRepository.findAllByCondition({
          userId: currentUserId,
          parentFolderId: folderId,
        });
      } catch (error) {
        if (error instanceof NotFoundException) {
          subFolders = [];
        } else {
          throw error;
        }
      }

      if (subFolders.length > 0) {
        for (const subFolder of subFolders) {
          const recursiveResult = await this.deleteFolderRecursively(
            currentUserId,
            subFolder.id,
            userGoogleServiceAccounts,
          );

          result = result.concat(recursiveResult.result);
          deletedFilesAll = deletedFilesAll.concat(
            recursiveResult.deletedFilesAll,
          );
          deletedFoldersAll = deletedFoldersAll.concat(
            recursiveResult.deletedFoldersAll,
          );
        }
      }

      const deletedFolder = await this.foldersRepository.deleteById(folderId);
      result.push({
        folderId: deletedFolder.id,
        status: 'success',
      });

      deletedFoldersAll = deletedFoldersAll.concat(deletedFolder);

      return { result, deletedFilesAll, deletedFoldersAll };
    } catch (error) {
      throw error;
    }
  }
}
