import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import {
  FILES_REPOSITORY,
  FOLDERS_REPOSITORY,
  STATS_REPOSITORY,
  USERS_REPOSITORY,
} from '@/configs/providersTokens';
import { StatsRepository } from '../stats/repository/stats.repository';
import { CreateFilePermissionsDto } from './dto/create-file-permissions';
import { CreateFolderDto } from './dto/create-folder.dto';
import { FileSortedDto } from './dto/file-sorted.dto';
import { FindFilesByConditionsDto } from './dto/find-public-file-by-conditions.dto';
import { FindFilesSortedDto } from './dto/find-public-file-sorted.dto';
import { FolderSortedDto } from './dto/folder-sorted.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FilesRepository } from './repository/files.repository';
import { FoldersRepository } from './repository/folders.repository';
import { DeleteFileSystemService } from './services/deleteFileSystemService/deleteFileSystemService';
import { FileTransferService } from './services/fileTransferService/fileTransferService';
import { PermissionsService } from './services/permissionsService/permissionsService';
import { UpdateFileSystemService } from './services/updateFileSystemService/updateFileSystemService';
import { DeleteMany } from './types/delete-many-params';
import { File } from './types/file';
import { FileUploadResult } from './types/file-upload-result';
import { FileSystemItemChangeResult } from './types/fileSystemItem-change-result';
import { Folder } from './types/folder';
import { updateMany } from './types/update-many-params';

@Injectable()
export class FilesSystemService {
  constructor(
    @Inject(FILES_REPOSITORY)
    private readonly filesRepository: FilesRepository,
    @Inject(FOLDERS_REPOSITORY)
    private readonly foldersRepository: FoldersRepository,
    @Inject(STATS_REPOSITORY)
    private readonly statsRepository: StatsRepository,
    private readonly fileTransferService: FileTransferService,
    private readonly permissionsService: PermissionsService,
    private readonly updateFileSystemService: UpdateFileSystemService,
    private readonly deleteFileSystemService: DeleteFileSystemService,
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
    orderFoldersBy?: { orderBy: string },
    orderFilesBy?: { orderBy: string },
    isFolderFirst?: boolean,
    offset?: number,
    limit?: number,
  ): Promise<(File | Folder)[]> {
    const baseCondition = { userId: currentUserId, parentFolderId };

    async function safeFind<T, D>(
      repo: {
        parsedArrayCondition: Function;
        findAllByCondition: Function;
      },
      orderBy: { orderBy: string } | undefined,
      dto: new () => D,
    ): Promise<T[]> {
      try {
        const parsedOrder = orderBy
          ? await repo.parsedArrayCondition(orderBy, dto)
          : undefined;

        return await repo.findAllByCondition(baseCondition, parsedOrder);
      } catch (error) {
        if (error instanceof NotFoundException) return [];
        throw error;
      }
    }

    const [folders, files] = await Promise.all([
      safeFind<Folder, FolderSortedDto>(
        this.foldersRepository,
        orderFoldersBy,
        FolderSortedDto,
      ),
      safeFind<File, FileSortedDto>(
        this.filesRepository,
        orderFilesBy,
        FileSortedDto,
      ),
    ]);

    const merged = isFolderFirst
      ? [...folders, ...files]
      : [...files, ...folders];

    return limit !== undefined
      ? merged.slice(offset, offset + limit)
      : merged.slice(offset);
  }

  async findPublicFiles(
    condition: { condition: string },
    orderBy?: { orderBy: string },
    offset?: number,
    limit?: number,
  ): Promise<File[]> {
    try {
      const parsedCondition =
        await this.filesRepository.parsedCondition<FindFilesByConditionsDto>(
          condition,
          FindFilesByConditionsDto,
        );

      const parsedOrderBy = orderBy
        ? await this.filesRepository.parsedArrayCondition<FindFilesSortedDto>(
            orderBy,
            FindFilesSortedDto,
          )
        : undefined;

      return await this.filesRepository.findAllByCondition(
        { ...parsedCondition, publicAccessRole: { notNull: true } },
        parsedOrderBy,
        offset,
        limit,
      );
    } catch (error) {
      if (error?.errors[0]?.message) {
        this.mapGoogleError(error);
      }
      throw error;
    }
  }

  async updateFile(
    currentUserId: UUID,
    fileUpdateDto: UpdateFileDto,
  ): Promise<File> {
    try {
      return await this.updateFileSystemService.updateFile(
        currentUserId,
        fileUpdateDto,
      );
    } catch (error) {
      if (error?.errors[0]?.message) {
        this.mapGoogleError(error);
      }
      throw error;
    }
  }

  async updateFolder(
    currentUserId: UUID,
    updateFolderDto: UpdateFolderDto,
  ): Promise<Folder> {
    try {
      return await this.updateFileSystemService.updateFolder(
        currentUserId,
        updateFolderDto,
      );
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
    try {
      return await this.updateFileSystemService.updateMany(
        currentUserId,
        updateManyDto,
      );
    } catch (error) {
      if (error?.errors[0]?.message) {
        this.mapGoogleError(error);
      }
      throw error;
    }
  }

  async deleteFile(currentUserId: UUID, fileId: string): Promise<File> {
    try {
      return await this.deleteFileSystemService.deleteFile(
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

  async deleteFolder(
    currentUserId: UUID,
    folderId: UUID,
  ): Promise<FileSystemItemChangeResult[]> {
    try {
      return await this.deleteFileSystemService.deleteFolder(
        currentUserId,
        folderId,
      );
    } catch (error) {
      if (error?.errors[0]?.message) {
        this.mapGoogleError(error);
      }
      throw error;
    }
  }

  async deleteMany(
    currentUserId: UUID,
    deleteManyDto: DeleteMany,
  ): Promise<FileSystemItemChangeResult[]> {
    try {
      return await this.deleteFileSystemService.deleteMany(
        currentUserId,
        deleteManyDto,
      );
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
