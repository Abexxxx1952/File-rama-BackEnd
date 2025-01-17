import { CacheInterceptor } from '@nestjs/cache-manager';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Req,
  Sse,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { CurrentUser } from '@/common/decorators/currentUser.decorator';
import {
  CacheOptionInvalidateCache,
  CacheOptions,
} from '@/common/interceptors/cache.interceptor';
import { PaginationParams } from '@/database/paginationDto/pagination.dto';
import { AccessTokenAuthGuardFromCookies } from '../users/auth/guards/access-token-from-cookies.guard';
import { AttachedUser } from '../users/auth/types/attachedUser';
import { CreateFolderDto } from './dto/create-folder.dto';
import { FindFilesByConditionsDto } from './dto/find-file-by-conditions.dto';
import { FilesSystemService } from './filesSystem.service';
import { FilesRepository } from './repository/files.repository';
import { File } from './types/file';
import { FileUploadResult } from './types/file-upload-result';
import { Folder } from './types/folder';

@ApiTags('v1/files')
@Controller('v1/files')
export class FilesController {
  constructor(
    @Inject('FilesRepository')
    private readonly filesRepository: FilesRepository,
    private readonly filesSystemService: FilesSystemService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(CacheInterceptor)
  @UseGuards(AccessTokenAuthGuardFromCookies)
  async findRoot(
    @CurrentUser() currentUser: AttachedUser,
    @Query() { offset, limit }: PaginationParams,
  ): Promise<(File | Folder)[]> {
    return await this.filesSystemService.findRoot(currentUser, offset, limit);
  }

  @Post('create-file')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: ['/api/v1/users/', '/api/v1/files/'],
  })
  @UseInterceptors(CacheInterceptor)
  async createFile(
    @CurrentUser() currentUser: AttachedUser,
    @Req() request: FastifyRequest,
  ): Promise<FileUploadResult[]> {
    return await this.filesSystemService.createFile(currentUser, request);
  }

  @Post('create-folder')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: ['/api/v1/users/', '/api/v1/files/'],
  })
  @UseInterceptors(CacheInterceptor)
  async createFolder(
    @CurrentUser() currentUser: AttachedUser,
    @Body() createFolderDto: CreateFolderDto,
  ): Promise<Folder> {
    return await this.filesSystemService.createFolder(
      currentUser,
      createFolderDto,
    );
  }

  @Sse('upload-progress')
  sse(@Req() request: FastifyRequest): Observable<MessageEvent> {
    return this.filesSystemService.uploadProgress(request);
  }
}
