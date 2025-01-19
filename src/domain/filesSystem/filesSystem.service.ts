import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { EventEmitter } from 'events';
import { FastifyRequest } from 'fastify';
import { drive_v3, google } from 'googleapis';
import { Observable } from 'rxjs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { UsersRepository } from '../users/repository/users.repository';
import { User } from '../users/types/users';
import { CreateFilePermissionsDto } from './dto/create-file-permissions';
import { CreateFileDto } from './dto/create-file.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FilesRepository } from './repository/files.repository';
import { FoldersRepository } from './repository/folders.repository';
import { File } from './types/file';
import { FileUploadEvent, StatusUpload } from './types/file-upload-event';
import { FileUploadResult } from './types/file-upload-result';
import { Folder } from './types/folder';
import { NameConflictChoice } from './types/upload-name-conflict';

@Injectable()
export class FilesSystemService {
  private driveService: drive_v3.Drive;
  public readonly eventSource = new EventEmitter();
  constructor(
    @Inject('UsersRepository')
    private readonly usersRepository: UsersRepository,
    @Inject('FilesRepository')
    private readonly filesRepository: FilesRepository,
    @Inject('FoldersRepository')
    private readonly foldersRepository: FoldersRepository,
  ) {}

  async createFile(
    currentUserId: UUID,
    createFileDto: CreateFileDto,
    request: FastifyRequest,
  ): Promise<FileUploadResult[]> {
    const pipelineAsync = promisify(pipeline);
    let fileName: string | null = null;
    let mimeType: string | null = null;
    const uploadResults: FileUploadResult[] = [];
    let user: User;
    let fileLoaded = false;
    let hasMoreFiles = false;
    let {
      description,
      conflictChoice,
      parentFolderId,
      parentFolderGoogleDriveId,
    } = createFileDto;
    try {
      user = await this.usersRepository.findById(currentUserId);
    } catch (error) {
      throw error;
    }

    try {
      for (const account of user.googleServiceAccounts) {
        const { clientEmail, privateKey, rootFolderId } = account;

        await this.authenticate({ clientEmail, privateKey });

        const about = await this.driveService.about.get({
          fields: 'storageQuota',
        });

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
            console.log('part.file', part.file);

            part.file.on('data', (chunk) => {
              receivedBytes += chunk.length;
              const progress = Math.round((receivedBytes / fileSize) * 100);
              this.eventSource.emit('upload-progress', {
                fileName,
                progress,
                status: StatusUpload.UPLOADING,
                error: null,
              });
            });

            part.file.on('end', () => {
              this.eventSource.emit('upload-progress', {
                fileName,
                progress: 100,
                status: StatusUpload.COMPLETE,
                error: null,
              });
            });

            part.file.on('error', (err) => {
              this.eventSource.emit('upload-progress', {
                fileName,
                progress: 0,
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
                    : [rootFolderId],
                  description,
                },
                media: {
                  body: stream,
                },
                fields:
                  'id, webViewLink, webContentLink, size, createdTime, fileExtension',
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
                fileGoogleDriveParentFolderId: parentFolderGoogleDriveId
                  ? parentFolderGoogleDriveId
                  : rootFolderId,
                uploadDate: new Date(response.data.createdTime),
                isPublic: false,
              });

              uploadResults.push({
                file,
                status: StatusUpload.COMPLETE,
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
        error.message = `${fileName} status: ${StatusUpload.FAILED} error: ${error.message}`;
        throw new BadRequestException(error.message);
      }
    }
  }

  async createFolder(
    currentUserId: UUID,
    createfolderDto: CreateFolderDto,
  ): Promise<Folder> {
    let user: User;

    try {
      user = await this.usersRepository.findById(currentUserId);
    } catch (error) {
      throw error;
    }
    try {
      const folderName = await this.handleNameConflict(
        'folder',
        createfolderDto.parentFolderId,
        createfolderDto.folderName,
      );

      const folder = await this.foldersRepository.create({
        folderName,
        userId: user.id,
        parentFolderId: createfolderDto.parentFolderId,
      });
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

  async findFileById(currentUserId: UUID, fileId: UUID): Promise<File> {
    try {
      const files = await this.filesRepository.findOneByCondition({
        userId: currentUserId,
        id: fileId,
      });
      return files;
    } catch (error) {
      throw error;
    }
  }

  async findFolderById(currentUserId: UUID, folderId: UUID): Promise<Folder> {
    try {
      const folders = await this.foldersRepository.findOneByCondition({
        userId: currentUserId,
        id: folderId,
      });
      return folders;
    } catch (error) {
      throw error;
    }
  }

  async updateFileById(
    currentUserId: UUID,
    updateFileDto: UpdateFileDto,
  ): Promise<File> {
    try {
      const file = await this.filesRepository.updateById(
        currentUserId,
        updateFileDto,
      );
      return file;
    } catch (error) {
      throw error;
    }
  }

  async updateFolderById(
    currentUserId: UUID,
    updateFolderDto: UpdateFolderDto,
  ): Promise<Folder> {
    try {
      const folder = await this.foldersRepository.updateById(
        currentUserId,
        updateFolderDto,
      );
      return folder;
    } catch (error) {
      throw error;
    }
  }

  async deleteFile(currentUserId: UUID, fileId: string): Promise<File> {
    try {
      const user = await this.usersRepository.findById(currentUserId);
      const file = await this.filesRepository.findOneByCondition({
        userId: currentUserId,
        id: fileId,
      });

      for (const account of user.googleServiceAccounts) {
        const { clientEmail, privateKey } = account;
        try {
          await this.authenticate({ clientEmail, privateKey });

          const response = await this.driveService.files.delete({
            fileId: file.fileGoogleDriveId,
          });

          if (response.status === 204) {
            return await this.filesRepository.deleteById(file.id);
          }
        } catch (error) {
          if (error.code === 404) {
            continue;
          }
          throw error;
        }
      }
      throw new NotFoundException('File not found');
    } catch (error) {
      throw error;
    }
  }

  async deleteFolder(currentUserId: UUID, folderId: UUID): Promise<Folder> {
    try {
      await this.foldersRepository.findOneByCondition({
        userId: currentUserId,
        id: folderId,
      });

      return await this.deleteFolderRecursively(currentUserId, folderId);
    } catch (error) {
      throw error;
    }
  }

  async createFilePermissions(
    createFilePermissionsDto: CreateFilePermissionsDto,
  ) {
    try {
      /*   await this.authenticate(createFilePermissionsDto); */
      await this.driveService.permissions.create({
        fileId: createFilePermissionsDto.fileId,
        requestBody: {
          role: createFilePermissionsDto.role,
          type: 'anyone',
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async deleteFilePermissions(fileId: string) {
    const permissions = await this.driveService.permissions.list({
      fileId: fileId,
    });

    const publicPermission = permissions.data.permissions.find(
      (permission) => permission.type === 'anyone',
    );

    if (publicPermission) {
      await this.driveService.permissions.delete({
        fileId: fileId,
        permissionId: publicPermission.id,
      });
    }
  }

  uploadProgress(request: FastifyRequest): Observable<MessageEvent> {
    return new Observable((observer) => {
      this.eventSource.on('upload-progress', (progress: FileUploadEvent) => {
        switch (progress.status) {
          case StatusUpload.UPLOADING:
            observer.next({
              data: progress,
            } as MessageEvent);
            break;
          case StatusUpload.COMPLETE:
            observer.next({
              data: progress,
            } as MessageEvent);
            observer.complete();
            break;
          case StatusUpload.FAILED:
            observer.error({
              data: progress,
            } as MessageEvent);
            break;
        }
      });
    });
  }
  private async authenticate(authDto: GoogleAuthDto) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: authDto.clientEmail,
        private_key: authDto.privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    this.driveService = google.drive({ version: 'v3', auth });
  }
  private async handleNameConflict(
    entity: 'file' | 'folder',
    parentFolderId: string,
    name: string,
    userChoice: NameConflictChoice = NameConflictChoice.RENAME,
  ): Promise<string> {
    if (entity === 'file') {
    }
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
            const extension = uniqueName.split('.').pop();
            const nameWithoutExtension = uniqueName.slice(
              0,
              -(extension.length + 1),
            );
            uniqueName = `${nameWithoutExtension} (${counter}).${extension}`;
          } else {
            uniqueName = `${uniqueName} (${counter})`;
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

  private async deleteFolderRecursively(
    currentUserId: UUID,
    folderId: string,
  ): Promise<Folder> {
    try {
      const files = await this.filesRepository.findAllByCondition({
        userId: currentUserId,
        parentFolderId: folderId,
      });

      for (const file of files) {
        await this.filesRepository.deleteById(file.id);
      }

      const subFolders = await this.foldersRepository.findAllByCondition({
        userId: currentUserId,
        parentFolderId: folderId,
      });

      const folder = await this.foldersRepository.deleteById(folderId);

      for (const subFolder of subFolders) {
        await this.deleteFolderRecursively(currentUserId, subFolder.id);
      }
      return folder;
    } catch (error) {
      throw error;
    }
  }
}
