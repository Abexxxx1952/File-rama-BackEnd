import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { TransformResultInterceptor } from '@/common/interceptors/transform-result.interceptor';
import { CurrentUser } from '../../common/decorators/currentUser.decorator';
import { ParseRequestBodyWhenLogging } from '../../common/decorators/setMetadataRequestBodyLogging.decorator';
import {
  CacheInterceptor,
  CacheOptionInvalidateCache,
  CacheOptions,
} from '../../common/interceptors/cache.interceptor';
import { PaginationParams } from '../../database/paginationDto/pagination.dto';
import {
  ApiUsersDeleteDeleteUser,
  ApiUsersDeleteDeleteUserFromHeaders,
  ApiUsersGet,
  ApiUsersGetFindById,
  ApiUsersGetFindManyBy,
  ApiUsersGetFindOneBy,
  ApiUsersGetFindWithRelations,
  ApiUsersPatchUpdate,
  ApiUsersPatchUpdateFromHeaders,
} from '../../swagger/users';
import { AccessTokenAuthGuardFromCookies } from './auth/guards/access-token-from-cookies.guard';
import { AccessTokenAuthGuardFromHeaders } from './auth/guards/access-token-from-headers.guard';
import { FindUsersByConditionsDto } from './dto/find-by-conditions.dto';
import { relationsUserDto } from './dto/relations.dto';
import {
  UpdateUserDto,
  UpdateUserDtoLocalWithoutPasswords,
} from './dto/update.dto';
import { UsersRepository } from './repository/users.repository';
import { UserWithRelatedEntity } from './types/user-with-related-entity';
import { User, UserPoor } from './types/users';

@ApiTags('v1/users')
@Controller('v1/users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(
    @Inject('UsersRepository')
    private readonly usersRepository: UsersRepository,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(new TransformResultInterceptor(UserPoor))
  @UseInterceptors(CacheInterceptor)
  @ApiUsersGet()
  async findAll(@Query() { offset, limit }: PaginationParams): Promise<User[]> {
    return await this.usersRepository.findAll(offset, limit);
  }

  @Get('findById/:id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(new TransformResultInterceptor(UserPoor))
  @UseInterceptors(CacheInterceptor)
  @ApiUsersGetFindById()
  async findOneById(@Param('id', ParseUUIDPipe) id: UUID): Promise<User> {
    return await this.usersRepository.findById(id);
  }

  @Get('findWithRelations')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @UseInterceptors(new TransformResultInterceptor(User))
  @UseInterceptors(CacheInterceptor)
  @ApiUsersGetFindWithRelations()
  async findByIdWithRelations(
    @CurrentUser('id') currentUserId: UUID,
    @Query() condition: { condition: string },
  ): Promise<UserWithRelatedEntity> {
    let parsedRelations: relationsUserDto;
    try {
      parsedRelations =
        await this.usersRepository.parsedCondition<relationsUserDto>(
          condition,
          relationsUserDto,
        );
    } catch (error) {
      throw error;
    }

    return await this.usersRepository.findByIdWithRelations<UserWithRelatedEntity>(
      currentUserId,
      parsedRelations.relations,
    );
  }

  @Get('findOneBy')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(new TransformResultInterceptor(UserPoor))
  @UseInterceptors(CacheInterceptor)
  @ApiUsersGetFindOneBy()
  async findOneByCondition(
    @Query() condition: { condition: string },
  ): Promise<User> {
    let parsedCondition: FindUsersByConditionsDto;
    try {
      parsedCondition =
        await this.usersRepository.parsedCondition<FindUsersByConditionsDto>(
          condition,
          FindUsersByConditionsDto,
        );
    } catch (error) {
      throw error;
    }

    return await this.usersRepository.findOneByCondition(parsedCondition);
  }

  @Get('findManyBy')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(new TransformResultInterceptor(UserPoor))
  @UseInterceptors(CacheInterceptor)
  @ApiUsersGetFindManyBy()
  async findManyByCondition(
    @Query() { offset, limit }: PaginationParams,
    @Query() condition: { condition: string },
  ): Promise<User[]> {
    let parsedCondition: FindUsersByConditionsDto;
    try {
      parsedCondition =
        await this.usersRepository.parsedCondition<FindUsersByConditionsDto>(
          condition,
          FindUsersByConditionsDto,
        );
    } catch (error) {
      throw error;
    }

    return await this.usersRepository.findAllByCondition(
      parsedCondition,
      offset,
      limit,
    );
  }

  @Patch('update')
  @ParseRequestBodyWhenLogging(UpdateUserDtoLocalWithoutPasswords)
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(new TransformResultInterceptor(User))
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: ['/api/v1/users/', '/api/v1/stats'],
  })
  @UseInterceptors(CacheInterceptor)
  @ApiUsersPatchUpdate()
  async updateUser(
    @CurrentUser('id') currentUserId: UUID,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return await this.usersRepository.updateUserById(
      currentUserId,
      updateUserDto,
    );
  }

  @Patch('updateFromHeaders')
  @ParseRequestBodyWhenLogging(UpdateUserDtoLocalWithoutPasswords)
  @UseGuards(AccessTokenAuthGuardFromHeaders)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(new TransformResultInterceptor(User))
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: ['/api/v1/users/', '/api/v1/stats'],
  })
  @UseInterceptors(CacheInterceptor)
  @ApiUsersPatchUpdateFromHeaders()
  async updateUserFromHeaders(
    @CurrentUser('id') currentUserId: UUID,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return await this.usersRepository.updateUserById(
      currentUserId,
      updateUserDto,
    );
  }

  @Delete('delete')
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(new TransformResultInterceptor(User))
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: ['/api/v1/users/'],
  })
  @UseInterceptors(CacheInterceptor)
  @ApiUsersDeleteDeleteUser()
  async deleteUser(@CurrentUser('id') currentUserId: UUID): Promise<User> {
    return await this.usersRepository.deleteById(currentUserId);
  }

  @Delete('deleteFromHeaders')
  @UseGuards(AccessTokenAuthGuardFromHeaders)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(new TransformResultInterceptor(User))
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: ['/api/v1/users/'],
  })
  @UseInterceptors(CacheInterceptor)
  @ApiUsersDeleteDeleteUserFromHeaders()
  async deleteUserFromHeaders(
    @CurrentUser('id') currentUserId: UUID,
  ): Promise<User> {
    return await this.usersRepository.deleteById(currentUserId);
  }
}
