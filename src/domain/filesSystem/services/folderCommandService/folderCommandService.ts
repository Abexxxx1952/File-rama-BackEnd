import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { drive_v3 } from 'googleapis';
import {
  FILES_REPOSITORY,
  FOLDERS_REPOSITORY,
} from '@/configs/providersTokens';
import { User } from '@/domain/users/types/users';
import { FilesRepository } from '../../repository/files.repository';
import { FoldersRepository } from '../../repository/folders.repository';
import { DeleteFolderRecursivelyResult } from '../../types/delete-folder-recursively-result';
import { File } from '../../types/file';
import { FileSystemItemChangeResult } from '../../types/fileSystemItem-change-result';
import { Folder } from '../../types/folder';
import { NameConflictChoice } from '../../types/upload-name-conflict';
import { GoogleDriveClient } from '../googleDriveClient/googleDriveClient';

@Injectable()
export class FolderCommandService {
  constructor(
    @Inject(FOLDERS_REPOSITORY)
    private readonly foldersRepository: FoldersRepository,
    @Inject(FILES_REPOSITORY)
    private readonly filesRepository: FilesRepository,
    private readonly googleDriveClient: GoogleDriveClient,
  ) {}
  async handleFolderNameConflict(
    parentFolderId: string | null,
    name: string,
    userChoice: NameConflictChoice = NameConflictChoice.RENAME,
  ): Promise<string> {
    let innerEntity: Folder;
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

  async deleteFolderRecursively(
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
