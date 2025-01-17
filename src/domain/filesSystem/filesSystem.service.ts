import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter } from 'events';
import { FastifyRequest } from 'fastify';
import { drive_v3, google } from 'googleapis';
import { Observable } from 'rxjs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { AttachedUser } from '../users/auth/types/attachedUser';
import { UsersRepository } from '../users/repository/users.repository';
import { User } from '../users/types/users';
import { CreateFolderDto } from './dto/create-folder.dto';
import { DeleteFileDto } from './dto/delete-file.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { UpdateFilePermissionsDto } from './dto/update-file-permissions';
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
    currentUser: AttachedUser,
    request: FastifyRequest,
  ): Promise<FileUploadResult[]> {
    const pipelineAsync = promisify(pipeline);
    let fileName: string | null = null;
    let mimeType: string | null = null;
    const uploadResults: FileUploadResult[] = [];
    let user: User;
    let fileLoaded = false;
    let hasMoreFiles = false;

    try {
      user = await this.usersRepository.findById(currentUser.id);
    } catch (error) {
      throw error;
    }

    try {
      if (!request.isMultipart()) {
        throw new Error('Request is not multipart');
      }

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

        if (availableSpace < fileSize) {
          continue;
        }

        for await (const part of request.parts()) {
          let parentFolderId: string | null = null;
          let parentFolderGoogleDriveId: string | null = null;
          let description: string | null = null;
          let conflictChoice: NameConflictChoice | null = null;
          if (part.type === 'field') {
            if (part.fieldname === 'parentFolder') {
              parentFolderId = String(part.value);
            }
          }
          if (part.type === 'field') {
            if (part.fieldname === 'parentFolderGoogleDriveId') {
              parentFolderGoogleDriveId = String(part.value);
            }
          }
          if (part.type === 'field') {
            if (part.fieldname === 'description') {
              description = String(part.value);
            }
          }
          if (part.type === 'field') {
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

              await this.filesRepository.create({
                userId: user.id,
                fileId: response.data.id,
                fileUrl: response.data.webViewLink,
                fileDownloadUrl: response.data.webContentLink,
                fileName,
                fileExtension: response.data.fileExtension,
                fileSize: response.data.size,
                fileDescription: description,
                parentFolderId,
                uploadDate: new Date(response.data.createdTime),
                isPublic: false,
              });

              uploadResults.push({
                fileName,
                fileId: response.data.id,
                downloadLink: response.data.webContentLink,
                webViewLink: response.data.webViewLink,
                size: response.data.size,
                status: StatusUpload.COMPLETE,
                account: clientEmail,
              });
            });
            fileLoaded = true;
          }
        }
      }

      if (!fileLoaded) {
        uploadResults.push({
          fileName,
          status: StatusUpload.FAILED,
          error: 'File not loaded. No availableSpace',
        });
      }
      if (hasMoreFiles) {
        uploadResults.push({
          fileName: 'Others files',
          status: StatusUpload.FAILED,
          error: 'Only one file can be uploaded at a time',
        });
      }
    } catch (error) {
      uploadResults.push({
        fileName,
        status: StatusUpload.FAILED,
        error: error.message,
      });
    }

    return uploadResults;
  }

  async createFolder(
    currentUser: AttachedUser,
    createfolderDto: CreateFolderDto,
  ): Promise<Folder> {
    let user: User;
    try {
      user = await this.usersRepository.findById(currentUser.id);
    } catch (error) {
      throw error;
    }

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
  }

  async findRoot(
    currentUser: AttachedUser,
    offset: number,
    limit: number,
  ): Promise<(File | Folder)[]> {
    const folders = await this.foldersRepository.findAllByCondition(
      {
        userId: currentUser.id,
        parentFolderId: null,
      },
      offset,
      limit,
    );

    const files = await this.filesRepository.findAllByCondition(
      {
        userId: currentUser.id,
        parentFolderId: null,
      },
      offset,
      limit,
    );
    return [...folders, ...files];
  }

  async deleteFile(deleteFileDto: DeleteFileDto) {
    const { clientEmail, privateKey, fileId } = deleteFileDto;

    await this.authenticate({ clientEmail, privateKey });

    const response = await this.driveService.files.delete({
      fileId: fileId,
    });

    return response.data;
  }

  async updateFilePermissions(updateFileDto: UpdateFilePermissionsDto) {
    await this.driveService.permissions.create({
      fileId: updateFileDto.fileId,
      requestBody: {
        role: updateFileDto.role,
        type: 'anyone',
      },
    });
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
}
