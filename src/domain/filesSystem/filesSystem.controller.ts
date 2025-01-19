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
import { AccessTokenAuthGuardFromCookies } from '../users/auth/guards/access-token-from-cookies.guard';
import { CreateFileDto } from './dto/create-file.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { FindFilesByConditionsDto } from './dto/find-file-by-conditions.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FilesSystemService } from './filesSystem.service';
import { FilesRepository } from './repository/files.repository';
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
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(CacheInterceptor)
  @UseGuards(AccessTokenAuthGuardFromCookies)
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
  async findFileById(
    @CurrentUser('id') currentUserId: UUID,
    @Param('id', ParseUUIDPipe) fileId: UUID,
  ): Promise<File> {
    return await this.filesSystemService.findFileById(currentUserId, fileId);
  }

  @Get('findFolderById/:id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(CacheInterceptor)
  @UseGuards(AccessTokenAuthGuardFromCookies)
  async findFolderById(
    @CurrentUser('id') currentUserId: UUID,
    @Param('id', ParseUUIDPipe) folderId: UUID,
  ): Promise<Folder> {
    return await this.filesSystemService.findFolderById(
      currentUserId,
      folderId,
    );
  }

  @Get('findPublicFiles')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(CacheInterceptor)
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
    cacheKey: ['/api/v1/filesSystem/'],
  })
  @UseInterceptors(CacheInterceptor)
  async createFile(
    @CurrentUser('id') currentUserId: UUID,
    @Body() createFileDto: CreateFileDto,
    @Req() request: FastifyRequest,
  ): Promise<FileUploadResult[]> {
    return await this.filesSystemService.createFile(
      currentUserId,
      createFileDto,
      request,
    );
  }

  @Post('createFolder')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: ['/api/v1/filesSystem/'],
  })
  @UseInterceptors(CacheInterceptor)
  async createFolder(
    @CurrentUser('id') currentUserId: UUID,
    @Body() createFolderDto: CreateFolderDto,
  ): Promise<Folder> {
    return await this.filesSystemService.createFolder(
      currentUserId,
      createFolderDto,
    );
  }

  @Patch('updateFile')
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @HttpCode(HttpStatus.OK)
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: ['/api/v1/filesSystem/'],
  })
  @UseInterceptors(CacheInterceptor)
  async updateFile(
    @CurrentUser('id') currentUserId: UUID,
    @Body() updateFileDto: UpdateFileDto,
  ): Promise<File> {
    return await this.filesSystemService.updateFileById(
      currentUserId,
      updateFileDto,
    );
  }

  @Patch('updateFolder')
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @HttpCode(HttpStatus.OK)
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: ['/api/v1/filesSystem/'],
  })
  @UseInterceptors(CacheInterceptor)
  async updateFolder(
    @CurrentUser('id') currentUserId: UUID,
    @Body() updateFolderDto: UpdateFolderDto,
  ): Promise<Folder> {
    return await this.filesSystemService.updateFolderById(
      currentUserId,
      updateFolderDto,
    );
  }

  @Delete('deleteFile')
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @HttpCode(HttpStatus.OK)
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: ['/api/v1/filesSystem/'],
  })
  @UseInterceptors(CacheInterceptor)
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
    cacheKey: ['/api/v1/filesSystem/'],
  })
  @UseInterceptors(CacheInterceptor)
  async deleteFolder(
    @CurrentUser('id') currentUserId: UUID,
    @Body() { folderId }: { folderId: UUID },
  ): Promise<Folder> {
    return await this.filesSystemService.deleteFolder(currentUserId, folderId);
  }

  @Sse('uploadProgress')
  sse(@Req() request: FastifyRequest): Observable<MessageEvent> {
    return this.filesSystemService.uploadProgress(request);
  }
}
