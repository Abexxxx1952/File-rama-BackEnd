import { CacheInterceptor } from '@nestjs/cache-manager';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Sse,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { CurrentUser } from '@/common/decorators/currentUser.decorator';
import {
  CacheOptionInvalidateCache,
  CacheOptions,
} from '@/common/interceptors/cache.interceptor';
import { PaginationParams } from '@/database/paginationDto/pagination.dto';
import {
  ApiFilesSystemDeleteDeleteFile,
  ApiFilesSystemDeleteDeleteFolder,
  ApiFilesSystemGet,
  ApiFilesSystemGetFindPublicFiles,
  ApiFilesSystemPatchCreateFilePermissions,
  ApiFilesSystemPatchDeleteFilePermissions,
  ApiFilesSystemPatchUpdateFile,
  ApiFilesSystemPatchUpdateFolder,
  ApiFilesSystemPostCreateFile,
  ApiFilesSystemPostCreateFolder,
  ApiFilesSystemsGetFindFileById,
  ApiFilesSystemsGetFindFolderById,
} from '@/swagger/filesSystem';
import { AccessTokenAuthGuardFromCookies } from '../users/auth/guards/access-token-from-cookies.guard';
import { CreateFilePermissionsDto } from './dto/create-file-permissions';
import { CreateFolderDto } from './dto/create-folder.dto';
import { FindFilesByConditionsDto } from './dto/find-public-file-by-conditions.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FilesSystemService } from './filesSystem.service';
import { FilesRepository } from './repository/files.repository';
import { FoldersRepository } from './repository/folders.repository';
import { File } from './types/file';
import { FileUploadResult } from './types/file-upload-result';
import { Folder } from './types/folder';

@ApiTags('v1/filesSystem')
@Controller('v1/filesSystem')
export class FilesController {
  constructor(
    private readonly filesSystemService: FilesSystemService,
    @Inject('FilesRepository')
    private readonly filesRepository: FilesRepository,
    @Inject('FoldersRepository')
    private readonly foldersRepository: FoldersRepository,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(CacheInterceptor)
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @ApiFilesSystemGet()
  async findSlice(
    @CurrentUser('id') currentUserId: UUID,
    @Query() { parentFolderId }: { parentFolderId?: string },
    @Query() { offset, limit }: PaginationParams,
  ): Promise<(File | Folder)[]> {
    return await this.filesSystemService.findSlice(
      currentUserId,
      parentFolderId,
      offset,
      limit,
    );
  }

  @Get('findFileById/:id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(CacheInterceptor)
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @ApiFilesSystemsGetFindFileById()
  async findFileById(
    @CurrentUser('id') currentUserId: UUID,
    @Param('id', ParseUUIDPipe) fileId: UUID,
  ): Promise<File> {
    return await this.filesRepository.findOneByCondition({
      userId: currentUserId,
      id: fileId,
    });
  }

  @Get('findFolderById/:id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(CacheInterceptor)
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @ApiFilesSystemsGetFindFolderById()
  async findFolderById(
    @CurrentUser('id') currentUserId: UUID,
    @Param('id', ParseUUIDPipe) folderId: UUID,
  ): Promise<Folder> {
    return await this.foldersRepository.findOneByCondition({
      userId: currentUserId,
      id: folderId,
    });
  }

  @Get('findPublicFiles')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(CacheInterceptor)
  @ApiFilesSystemGetFindPublicFiles()
  async findPublicFiles(
    @Query() condition: { condition: string },
    @Query() { offset, limit }: PaginationParams,
  ): Promise<File[]> {
    let parsedCondition: FindFilesByConditionsDto;
    try {
      parsedCondition =
        await this.filesRepository.parsedCondition<FindFilesByConditionsDto>(
          condition,
          FindFilesByConditionsDto,
        );
    } catch (error) {
      throw error;
    }

    return await this.filesRepository.findAllByCondition(
      { ...parsedCondition, isPublic: true },
      offset,
      limit,
    );
  }

  @Post('createFile')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: [
      '/api/v1/filesSystem/*',
      '/api/v1/users/findWithRelations/',
      '/api/v1/stats/',
    ],
  })
  @UseInterceptors(CacheInterceptor)
  @ApiFilesSystemPostCreateFile()
  async createFile(
    @CurrentUser('id') currentUserId: UUID,
    @Req() request: FastifyRequest,
  ): Promise<FileUploadResult[]> {
    return await this.filesSystemService.createFile(currentUserId, request);
  }

  @Post('createFolder')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: [
      '/api/v1/filesSystem/*',
      '/api/v1/users/findWithRelations/',
      '/api/v1/stats/',
    ],
  })
  @UseInterceptors(CacheInterceptor)
  @ApiFilesSystemPostCreateFolder()
  async createFolder(
    @CurrentUser('id') currentUserId: UUID,
    @Body() createFolderDto: CreateFolderDto,
  ): Promise<Folder> {
    return await this.filesSystemService.createFolder(
      currentUserId,
      createFolderDto,
    );
  }

  @Patch('createFilePermissions')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: ['/api/v1/filesSystem/*', '/api/v1/users/findWithRelations/'],
  })
  @UseInterceptors(CacheInterceptor)
  @ApiFilesSystemPatchCreateFilePermissions()
  async createFilePermissions(
    @CurrentUser('id') currentUserId: UUID,
    @Body() createFilePermissionsDto: CreateFilePermissionsDto,
  ): Promise<File> {
    return await this.filesSystemService.createFilePermissions(
      currentUserId,
      createFilePermissionsDto,
    );
  }

  @Patch('deleteFilePermissions')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: ['/api/v1/filesSystem/*', '/api/v1/users/findWithRelations/'],
  })
  @UseInterceptors(CacheInterceptor)
  @ApiFilesSystemPatchDeleteFilePermissions()
  async deleteFilePermissions(
    @CurrentUser('id') currentUserId: UUID,
    @Body() fileId: { fileId: UUID },
  ): Promise<File> {
    return await this.filesSystemService.deleteFilePermissions(
      currentUserId,
      fileId.fileId,
    );
  }

  @Patch('updateFile')
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @HttpCode(HttpStatus.OK)
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: ['/api/v1/filesSystem/*', '/api/v1/users/findWithRelations/'],
  })
  @UseInterceptors(CacheInterceptor)
  @ApiFilesSystemPatchUpdateFile()
  async updateFile(
    @CurrentUser('id') currentUserId: UUID,
    @Body() updateFileDto: UpdateFileDto,
  ): Promise<File> {
    return await this.filesRepository.updateFile(currentUserId, updateFileDto);
  }

  @Patch('updateFolder')
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @HttpCode(HttpStatus.OK)
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: ['/api/v1/filesSystem/*', '/api/v1/users/findWithRelations/'],
  })
  @UseInterceptors(CacheInterceptor)
  @ApiFilesSystemPatchUpdateFolder()
  async updateFolder(
    @CurrentUser('id') currentUserId: UUID,
    @Body() updateFolderDto: UpdateFolderDto,
  ): Promise<Folder> {
    return await this.foldersRepository.updateFolder(
      currentUserId,
      updateFolderDto,
    );
  }

  @Delete('deleteFile')
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @HttpCode(HttpStatus.OK)
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: [
      '/api/v1/filesSystem/*',
      '/api/v1/users/findWithRelations/',
      '/api/v1/stats/',
    ],
  })
  @UseInterceptors(CacheInterceptor)
  @ApiFilesSystemDeleteDeleteFile()
  async deleteFile(
    @CurrentUser('id') currentUserId: UUID,
    @Body() { fileId }: { fileId: UUID },
  ): Promise<File> {
    return await this.filesSystemService.deleteFile(currentUserId, fileId);
  }

  @Delete('deleteFolder')
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @HttpCode(HttpStatus.OK)
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: [
      '/api/v1/filesSystem/*',
      '/api/v1/users/findWithRelations/',
      '/api/v1/stats/',
    ],
  })
  @UseInterceptors(CacheInterceptor)
  @ApiFilesSystemDeleteDeleteFolder()
  async deleteFolder(
    @CurrentUser('id') currentUserId: UUID,
    @Body() { folderId }: { folderId: UUID },
  ): Promise<Folder> {
    return await this.foldersRepository.deleteFolder(currentUserId, folderId);
  }

  @Sse('uploadProgress')
  sse(@Req() request: FastifyRequest): Observable<MessageEvent> {
    return this.filesSystemService.uploadProgress(request);
  }
}
