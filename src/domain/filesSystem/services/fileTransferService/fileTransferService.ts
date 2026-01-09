import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { FastifyReply, FastifyRequest } from 'fastify';
import { createWriteStream, promises as fs } from 'fs';
import { GaxiosResponse } from 'gaxios';
import { drive_v3 } from 'googleapis';
import { join } from 'path';
import { Observable } from 'rxjs';
import { pipeline } from 'stream/promises';
import {
  FILES_REPOSITORY,
  STATS_REPOSITORY,
  USERS_REPOSITORY,
} from '@/configs/providersTokens';
import { StatsRepository } from '@/domain/stats/repository/stats.repository';
import { UsersRepository } from '@/domain/users/repository/users.repository';
import { User } from '@/domain/users/types/users';
import { FilesRepository } from '../../repository/files.repository';
import { emitterEventName } from '../../types/emitterEventName';
import { File } from '../../types/file';
import { FileUploadEvent, UploadStatus } from '../../types/file-upload-event';
import { FileUploadResult } from '../../types/file-upload-result';
import { NameConflictChoice } from '../../types/upload-name-conflict';
import { GoogleDriveClient } from '../googleDriveClient/googleDriveClient';
import { StaticFilesService } from '../staticFilesService/staticFilesService';

@Injectable()
export class FileTransferService implements OnModuleInit {
  private readonly uploadEmitters = new Map<string, EventEmitter>();
  private activeUploads = new Map<string, number>();
  private readonly MAX_UPLOADS_PER_USER: number;
  private currentStaticFilesSize = 0;
  constructor(
    private readonly configService: ConfigService,
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    @Inject(FILES_REPOSITORY)
    private readonly filesRepository: FilesRepository,
    @Inject(STATS_REPOSITORY)
    private readonly statsRepository: StatsRepository,
    private readonly googleDriveClient: GoogleDriveClient,
    private readonly staticFilesService: StaticFilesService,
  ) {
    this.MAX_UPLOADS_PER_USER = this.configService.getOrThrow<number>(
      'MAX_UPLOADS_PER_USER',
    );
  }

  async onModuleInit() {
    setTimeout(
      async () => {
        await this.staticFilesService.runInitialCleanup();

        this.currentStaticFilesSize =
          await this.filesRepository.getTotalStaticFilesSize();
      },
      2 * 60 * 1000, // 2 minutes
    );
  }

  @Cron('0 3 * * *') // every day at 3am
  async dailyCleanup() {
    await this.staticFilesService.dailyCleanup();

    this.currentStaticFilesSize =
      await this.filesRepository.getTotalStaticFilesSize();
  }

  async createFile(
    currentUserId: UUID,
    fileUploadId: string = '',
    request: FastifyRequest,
  ): Promise<FileUploadResult[]> {
    let driveService: drive_v3.Drive;
    let description: string | null = null;
    let conflictChoice: NameConflictChoice = NameConflictChoice.RENAME;
    let parentFolderId: string | null = null;
    let parentFolderGoogleDriveId: string | null = null;
    const uploadResults: FileUploadResult[] = [];
    let about: GaxiosResponse;
    let user: User;
    let fileLoaded = false;
    let hasMoreFiles = false;
    let uploadStarted = false;
    const [emitter, key] = this.getOrCreateEmitter(currentUserId, fileUploadId);

    try {
      user = await this.usersRepository.findById(currentUserId);
    } catch (error) {
      throw error;
    }

    if (!user.isVerified) {
      throw new ForbiddenException('User must be verified');
    }

    const allowed = this.startUpload(currentUserId);

    if (!allowed) {
      throw new BadRequestException('Parallel download limit exceeded');
    }
    uploadStarted = true;
    try {
      for (const account of user.googleServiceAccounts) {
        if (!account) {
          throw new ForbiddenException('Google service account not found');
        }

        const { clientEmail, privateKey, rootFolderId = null } = account;

        driveService = await this.googleDriveClient.authenticate({
          clientEmail,
          privateKey,
        });

        try {
          about = await driveService.about.get({
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
              setTimeout(() => {
                emitter.removeAllListeners();
                this.uploadEmitters.delete(key);
              }, 5000);
            });

            part.file.on('error', (err) => {
              emitter.emit(emitterEventName.UPLOAD_PROGRESS, {
                fileName,
                progress: receivedBytes,
                status: UploadStatus.FAILED,
                error: err.message,
              });
            });

            await pipeline(part.file, async (stream) => {
              const response = await driveService.files.create({
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
                fileSize: Number(response.data.size),
                fileDescription: description,
                parentFolderId,
                fileGoogleDriveId: response.data.id,
                fileGoogleDriveParentFolderId: response.data.parents[0],
                fileGoogleDriveClientEmail: clientEmail,
                uploadDate: new Date(response.data.createdTime),
                isPublic: parentFolderGoogleDriveId ? true : false,
              });

              await this.statsRepository.incrementFileCount(user.id);

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
      throw error;
    } finally {
      if (uploadStarted) {
        this.finishUpload(currentUserId);
      }
    }
  }

  async downloadFile(
    currentUserId: UUID,
    fileId: UUID,
    res: FastifyReply,
  ): Promise<void> {
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

      const meta = await driveService.files.get({
        fileId: file.fileGoogleDriveId,
        fields: 'name, mimeType, size',
      });

      if (!meta.data.name) {
        throw new NotFoundException('File not found');
      }

      const fileName = meta.data.name;
      const size = meta.data.size || '0';
      const mimeType = meta.data.mimeType || 'application/octet-stream';

      const fileStream = await driveService.files.get(
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
      res.header('Content-Length', size);
      res.header('Access-Control-Expose-Headers', 'Content-Disposition');

      return res.send(fileStream.data);
    } catch (error) {
      throw error;
    }
  }

  async streamPublicFile(fileId: UUID, res: FastifyReply): Promise<void> {
    const file = await this.filesRepository.findById(fileId);

    if (!file || !file.isPublic) {
      throw new NotFoundException('File not found');
    }

    const PUBLIC_STATIC_SERVER_URL = this.configService.getOrThrow<
      string | null
    >('PUBLIC_STATIC_SERVER_URL');

    if (file.fileStaticUrl) {
      const url = new URL(file.fileStaticUrl);
      const fileName = url.pathname.split('/').pop();

      if (PUBLIC_STATIC_SERVER_URL) {
        return res.redirect(`${PUBLIC_STATIC_SERVER_URL}/${fileName}`);
      }

      res
        .header('Access-Control-Allow-Origin', '*')
        .header('Cross-Origin-Resource-Policy', 'cross-origin')
        .header('Cross-Origin-Opener-Policy', 'cross-origin')
        .header('Cache-Control', 'public, max-age=300')
        .header('Accept-Ranges', 'bytes');

      return res.sendFile(fileName);
    }

    const STATIC_DIR = this.configService.getOrThrow<string>(
      'STATIC_FILES_PUBLIC_DIR',
    );
    const MAX_BYTES = this.configService.getOrThrow<number>(
      'STATIC_FILES_MAX_BYTES',
    );

    const user = await this.usersRepository.findById(file.userId);
    const drive = await this.googleDriveClient.getDrive(
      user,
      file.fileGoogleDriveClientEmail,
    );

    const meta = await drive.files.get({
      fileId: file.fileGoogleDriveId,
      fields: 'name, mimeType, size',
    });

    const fileSize = Number(meta.data.size ?? 0);

    if (this.currentStaticFilesSize + fileSize > MAX_BYTES) {
      return this.streamFromDrive(file, res);
    }

    await fs.mkdir(join(process.cwd(), STATIC_DIR), {
      recursive: true,
    });

    const extension = meta.data.name?.split('.').pop();
    const staticName = `${file.id}-${randomUUID()}.${extension}`;
    const staticPath = join(process.cwd(), STATIC_DIR, staticName);

    const driveStream = await drive.files.get(
      {
        fileId: file.fileGoogleDriveId,
        supportsAllDrives: true,
        alt: 'media',
      },
      { responseType: 'stream' },
    );

    await pipeline(driveStream.data, createWriteStream(staticPath));

    const DOMAIN = this.configService.getOrThrow<string>('SERVER_DOMAIN_URL');
    const PORT = this.configService.getOrThrow<number>('PORT');

    const STATIC_FILES_PUBLIC_DIR = this.configService.getOrThrow<string>(
      'STATIC_FILES_PUBLIC_DIR',
    );

    const staticUrl = `${DOMAIN}:${PORT}${STATIC_FILES_PUBLIC_DIR}/${staticName}`;

    this.filesRepository.updateById(file.id, {
      fileStaticUrl: staticUrl,
      fileStaticCreatedAt: new Date(),
    });

    if (PUBLIC_STATIC_SERVER_URL) {
      return res.redirect(`${PUBLIC_STATIC_SERVER_URL}/${staticName}`);
    }

    res
      .header('Access-Control-Allow-Origin', '*')
      .header('Cross-Origin-Resource-Policy', 'cross-origin')
      .header('Cross-Origin-Opener-Policy', 'cross-origin')
      .header('Cache-Control', 'public, max-age=300')
      .header('Accept-Ranges', 'bytes');

    return res.sendFile(staticName);
  }

  uploadProgress(
    currentUserId: UUID,
    fileUploadId: string = '',
  ): Observable<MessageEvent> {
    const [emitter] = this.getOrCreateEmitter(currentUserId, fileUploadId);

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

  private getOrCreateEmitter(
    userId: string,
    fileUploadId: string,
  ): [EventEmitter, string] {
    const key = `${userId}-${fileUploadId}`;
    if (!this.uploadEmitters.has(key)) {
      const emitter = new EventEmitter();
      emitter.setMaxListeners(5);
      this.uploadEmitters.set(key, emitter);
    }

    return [this.uploadEmitters.get(key), key];
  }

  private startUpload(userId: string): boolean {
    const current = this.activeUploads.get(userId) || 0;

    if (current >= this.MAX_UPLOADS_PER_USER) {
      return false;
    }

    this.activeUploads.set(userId, current + 1);
    return true;
  }

  private finishUpload(userId: string) {
    const current = this.activeUploads.get(userId) || 0;
    if (current <= 1) {
      this.activeUploads.delete(userId);
    } else {
      this.activeUploads.set(userId, current - 1);
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
      throw new Error(`Failed to handle file conflict: ${error.message}`, {
        cause: error,
      });
    }
  }

  private async streamFromDrive(file: File, res: FastifyReply) {
    const user = await this.usersRepository.findById(file.userId);
    const drive = await this.googleDriveClient.getDrive(
      user,
      file.fileGoogleDriveClientEmail,
    );

    const meta = await drive.files.get({
      fileId: file.fileGoogleDriveId,
      fields: 'name, mimeType',
    });

    const fileName = meta.data.name!;
    const mimeType = meta.data.mimeType || 'application/octet-stream';

    const stream = await drive.files.get(
      {
        fileId: file.fileGoogleDriveId,
        supportsAllDrives: true,
        alt: 'media',
      },
      { responseType: 'stream' },
    );

    res
      .header('Content-Type', mimeType)
      .header(
        'Content-Disposition',
        `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      )
      .header('Access-Control-Allow-Origin', '*')
      .header('Cross-Origin-Resource-Policy', 'cross-origin')
      .header('Cache-Control', 'public, max-age=300')
      .header('Accept-Ranges', 'bytes');

    return res.send(stream.data);
  }
}
