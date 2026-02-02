import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UUID } from 'crypto';
import { drive_v3 } from 'googleapis';
import {
  FILES_REPOSITORY,
  FOLDERS_REPOSITORY,
  STATS_REPOSITORY,
  USERS_REPOSITORY,
} from '@/configs/providersTokens';
import { StatsRepository } from '@/domain/stats/repository/stats.repository';
import { UsersRepository } from '@/domain/users/repository/users.repository';
import { User } from '@/domain/users/types/users';
import { FilesRepository } from '../../repository/files.repository';
import { FoldersRepository } from '../../repository/folders.repository';
import { DeleteFolderRecursivelyResult } from '../../types/delete-folder-recursively-result';
import { DeleteMany } from '../../types/delete-many-params';
import { File } from '../../types/file';
import { FileSystemItemChangeResult } from '../../types/fileSystemItem-change-result';
import { Folder } from '../../types/folder';
import { GoogleDriveClient } from '../googleDriveClient/googleDriveClient';

@Injectable()
export class DeleteFileSystemService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    @Inject(FILES_REPOSITORY)
    private readonly filesRepository: FilesRepository,
    @Inject(FOLDERS_REPOSITORY)
    private readonly foldersRepository: FoldersRepository,
    @Inject(STATS_REPOSITORY)
    private readonly statsRepository: StatsRepository,
    private readonly googleDriveClient: GoogleDriveClient,
  ) {}
  async deleteFile(currentUserId: UUID, fileId: string): Promise<File> {
    let driveService: drive_v3.Drive;
    try {
      const [user, file] = await Promise.all([
        this.usersRepository.findById(currentUserId),
        this.filesRepository.findOneByCondition({
          id: fileId,
          userId: currentUserId,
        }),
      ]);

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
      throw error;
    }
  }

  async deleteFolder(
    currentUserId: UUID,
    folderId: UUID,
  ): Promise<FileSystemItemChangeResult[]> {
    try {
      const [user, _] = await Promise.all([
        this.usersRepository.findById(currentUserId),
        this.foldersRepository.findOneByCondition({
          id: folderId,
          userId: currentUserId,
        }),
      ]);

      const result = await this.deleteFolderRecursively(
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
            const recursiveResult = await this.deleteFolderRecursively(
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
      throw error;
    }
  }

  private async deleteFolderRecursively(
    currentUserId: UUID,
    folderId: string,
    user: User,
  ): Promise<DeleteFolderRecursivelyResult> {
    let driveService: drive_v3.Drive;
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
          driveService = await this.googleDriveClient.getDrive(user, key);

          const executeDeleteFiles: Promise<void>[] = value.map(
            async (fileToDelete) => {
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
            user,
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
