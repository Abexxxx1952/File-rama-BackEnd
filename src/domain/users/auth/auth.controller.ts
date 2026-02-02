import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Recaptcha } from '@nestlab/google-recaptcha';
import { FastifyReply } from 'fastify';
import { TransformResultInterceptor } from '@/common/interceptors/transform-result.interceptor';
import { CurrentUser } from '../../../common/decorators/currentUser.decorator';
import { ParseRequestBodyWhenLogging } from '../../../common/decorators/setMetadataRequestBodyLogging.decorator';
import {
  CACHE_INVALIDATE_KEY_FLAG,
  CacheInterceptor,
  CacheOptionInvalidateCache,
  CacheOptions,
} from '../../../common/interceptors/cache.interceptor';
import {
  ApiUsersGetLoginGitHub,
  ApiUsersGetLoginGitHubCallback,
  ApiUsersGetLoginGoogle,
  ApiUsersGetLoginGoogleCallback,
  ApiUsersGetStatus,
  ApiUsersPostLoginLocal,
  ApiUsersPostLogOut,
  ApiUsersPostRefresh,
  ApiUsersPostRegistration,
} from '../../../swagger/users/index';
import { UsersService } from '../users.service';
import { User } from './../types/users';
import { AuthService } from './auth.service';
import { LoginLocalUserDtoWithoutPassword } from './dto/login-user-local.dto';
import {
  CreateUserDtoLocalWithoutPassword,
  CreateUserLocalDto,
} from './dto/register-local.dto';
import { AccessTokenAuthGuardFromHeadersAndCookies } from './guards/access-token-from-headers-cookies.guard';
import { GitHubAuthGuard } from './guards/gitHub.guard';
import { GoogleAuthGuard } from './guards/google.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RefreshTokenAuthGuardFromHeadersAndCookies } from './guards/refresh-token-from-headers-cookies.guard';
import { AtRtTokens } from './types/atRt-tokens';
import { AttachedUserWithRt } from './types/attached-user-withRt';
import { AttachedUser } from './types/attachedUser';

@ApiTags('v1/auth')
@Controller('v1/auth')
export class AuthController {
  constructor(
    @Inject()
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get('status')
  @UseGuards(AccessTokenAuthGuardFromHeadersAndCookies)
  @UseInterceptors(new TransformResultInterceptor(User))
  @HttpCode(HttpStatus.OK)
  @ApiUsersGetStatus()
  async status(@CurrentUser() currentUser: AttachedUser): Promise<User> {
    return await this.usersService.status(currentUser.email);
  }

  @Post('registration')
  @Recaptcha()
  @ParseRequestBodyWhenLogging(CreateUserDtoLocalWithoutPassword)
  @UseInterceptors(new TransformResultInterceptor(User))
  @HttpCode(HttpStatus.CREATED)
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: ['/api/v1/users' + CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS],
  })
  @UseInterceptors(CacheInterceptor)
  @ApiUsersPostRegistration()
  async create(@Body() createUserLocalDto: CreateUserLocalDto): Promise<User> {
    return await this.usersService.createUserLocal(createUserLocalDto);
  }

  @Post('loginLocal')
  @Recaptcha()
  @UseGuards(LocalAuthGuard)
  @ParseRequestBodyWhenLogging(LoginLocalUserDtoWithoutPassword)
  @UseInterceptors(new TransformResultInterceptor(User))
  @HttpCode(HttpStatus.OK)
  @ApiUsersPostLoginLocal()
  async loginLocal(
    @CurrentUser() currentUser: AttachedUser,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<User> {
    return await this.authService.login(currentUser, response);
  }

  @Post('logOut')
  @UseGuards(AccessTokenAuthGuardFromHeadersAndCookies)
  @HttpCode(HttpStatus.OK)
  @ApiUsersPostLogOut()
  async logout(
    @CurrentUser() currentUser: AttachedUser,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<AttachedUser> {
    return await this.authService.logout(currentUser, response);
  }

  @Post('refresh')
  @UseGuards(RefreshTokenAuthGuardFromHeadersAndCookies)
  @HttpCode(HttpStatus.OK)
  @ApiUsersPostRefresh()
  async refreshTokens(
    @CurrentUser() currentUserWithRt: AttachedUserWithRt,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<AtRtTokens> {
    return await this.authService.refreshTokens(currentUserWithRt, response);
  }

  @Get('loginGoogle')
  @UseGuards(GoogleAuthGuard)
  @HttpCode(HttpStatus.FOUND)
  @ApiUsersGetLoginGoogle()
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  googleAuth() {}

  @Get('loginGoogle/callback')
  @UseGuards(GoogleAuthGuard)
  @HttpCode(HttpStatus.MOVED_PERMANENTLY)
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: ['/api/v1/users' + CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS],
  })
  @UseInterceptors(CacheInterceptor)
  @ApiUsersGetLoginGoogleCallback()
  async googleAuthCallBack(
    @CurrentUser() currentUser: AttachedUser,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<void> {
    return await this.authService.loginWithProvider(currentUser, response);
  }

  @Get('loginGitHub')
  @UseGuards(GitHubAuthGuard)
  @HttpCode(HttpStatus.FOUND)
  @ApiUsersGetLoginGitHub()
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  gitHubAuth() {}

  @Get('loginGitHub/callback')
  @UseGuards(GitHubAuthGuard)
  @HttpCode(HttpStatus.MOVED_PERMANENTLY)
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: ['/api/v1/users' + CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS],
  })
  @UseInterceptors(CacheInterceptor)
  @ApiUsersGetLoginGitHubCallback()
  async gitHubAuthCallBack(
    @CurrentUser() currentUser: AttachedUser,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<void> {
    return await this.authService.loginWithProvider(currentUser, response);
  }
}
