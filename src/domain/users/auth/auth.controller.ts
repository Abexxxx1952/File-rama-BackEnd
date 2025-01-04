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
import { CurrentUser } from '../../../common/decorators/currentUser.decorator';
import { ParseRequestBodyWhenLogging } from '../../../common/decorators/setMetadataRequestBodyLogging.decorator';
import {
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
  ApiUsersGetStatusFromHeaders,
  ApiUsersPostLoginLocal,
  ApiUsersPostLogOut,
  ApiUsersPostLogOutFromHeaders,
  ApiUsersPostRefresh,
  ApiUsersPostRefreshFromHeaders,
  ApiUsersPostRegistration,
} from '../../../swagger/users/index';
import { UsersRepository } from './../repository/users.repository';
import { User } from './../types/users';
import { AuthService } from './auth.service';
import {
  CreateUserDtoLocalWithoutPassword,
  CreateUserLocalDto,
} from './dto/createLocal.dto';
import { LoginLocalUserDtoWithoutPassword } from './dto/loginUserLocal.dto';
import { AccessTokenAuthGuardFromCookies } from './guards/access-token-from-cookies.guard';
import { AccessTokenAuthGuardFromHeaders } from './guards/access-token-from-headers.guard';
import { GitHubAuthGuard } from './guards/gitHub.guard';
import { GoogleAuthGuard } from './guards/google.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RefreshTokenAuthGuardFromCookies } from './guards/refresh-token-from-cookies.guard';
import { RefreshTokenAuthGuardFromHeaders } from './guards/refresh-token-from-headers.guard';
import { AtRtTokens } from './types/atRt-tokens';
import { AttachedUserWithRt } from './types/attached-user-withRt';
import { AttachedUser } from './types/attachedUser';

@ApiTags('v1/auth')
@Controller('v1/auth')
export class AuthController {
  constructor(
    @Inject('UsersRepository')
    private readonly usersRepository: UsersRepository,
    private readonly authService: AuthService,
  ) {}

  @Get('status')
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @HttpCode(HttpStatus.OK)
  @ApiUsersGetStatus()
  async status(@CurrentUser() currentUser: AttachedUser): Promise<User> {
    return await this.usersRepository.status(currentUser.email);
  }

  @Get('statusFromHeaders')
  @UseGuards(AccessTokenAuthGuardFromHeaders)
  @HttpCode(HttpStatus.OK)
  @ApiUsersGetStatusFromHeaders()
  async statusFromHeaders(
    @CurrentUser() currentUser: AttachedUser,
  ): Promise<User> {
    return await this.usersRepository.status(currentUser.email);
  }

  @Post('registration')
  @Recaptcha()
  @ParseRequestBodyWhenLogging(CreateUserDtoLocalWithoutPassword)
  @HttpCode(HttpStatus.CREATED)
  @CacheOptionInvalidateCache({
    cache: CacheOptions.InvalidateCacheByKey,
    cacheKey: ['/api/v1/users/'],
  })
  @UseInterceptors(CacheInterceptor)
  @ApiUsersPostRegistration()
  async create(@Body() createUserLocalDto: CreateUserLocalDto): Promise<User> {
    return await this.usersRepository.createUserLocal(createUserLocalDto);
  }

  @Post('loginLocal')
  @Recaptcha()
  @UseGuards(LocalAuthGuard)
  @ParseRequestBodyWhenLogging(LoginLocalUserDtoWithoutPassword)
  @HttpCode(HttpStatus.OK)
  @ApiUsersPostLoginLocal()
  async loginLocal(
    @CurrentUser() currentUser: AttachedUser,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<User> {
    return await this.authService.login(currentUser, response);
  }

  @Post('logOut')
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @HttpCode(HttpStatus.OK)
  @ApiUsersPostLogOut()
  async logout(
    @CurrentUser() currentUser: AttachedUser,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<AttachedUser> {
    return await this.authService.logout(currentUser, response);
  }

  @Post('logOutFromHeaders')
  @UseGuards(AccessTokenAuthGuardFromHeaders)
  @HttpCode(HttpStatus.OK)
  @ApiUsersPostLogOutFromHeaders()
  async logoutFromHeaders(
    @CurrentUser() currentUser: AttachedUser,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<AttachedUser> {
    return await this.authService.logout(currentUser, response);
  }

  @Post('refresh')
  @UseGuards(RefreshTokenAuthGuardFromCookies)
  @HttpCode(HttpStatus.OK)
  @ApiUsersPostRefresh()
  async refreshTokens(
    @CurrentUser() currentUserWithRt: AttachedUserWithRt,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<AtRtTokens> {
    return await this.authService.refreshTokens(currentUserWithRt, response);
  }

  @Post('refreshFromHeaders')
  @UseGuards(RefreshTokenAuthGuardFromHeaders)
  @HttpCode(HttpStatus.OK)
  @ApiUsersPostRefreshFromHeaders()
  async refreshTokensFromHeaders(
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
    cacheKey: ['/api/v1/users/'],
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
    cacheKey: ['/api/v1/users/'],
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
