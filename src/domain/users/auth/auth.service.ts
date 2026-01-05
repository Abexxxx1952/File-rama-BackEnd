import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { FastifyReply } from 'fastify';
import { TOKENS_REPOSITORY, USERS_REPOSITORY } from '@/configs/providersTokens';
import { UsersRepository } from '../repository/users.repository';
import { User } from '../types/users';
import { TokensRepository } from './repository/tokens.repository';
import { TwoFactorAuthService } from './two-factor-auth/two-factor-auth.service';
import { AtRtTokens } from './types/atRt-tokens';
import { AttachedUserWithRt } from './types/attached-user-withRt';
import { AttachedUser } from './types/attachedUser';
import { JwtPayload } from './types/jwtPayload';
import { ParseUserOAuth } from './types/parse-user-oauth';
import { RegistrationSources } from './types/providers-oauth.enum';
import { Token, TokenTypeEnum } from './types/token';

@Injectable()
export class AuthService {
  private readonly pepper: string;
  private readonly accessTokenName: string;
  private readonly refreshTokenName: string;
  private readonly refreshTokenPath: string;
  private readonly authProviderRedirectUrl: string;
  private readonly accessTokenSecret: string;
  private readonly accessTokenExpirationTime: number;
  private readonly refreshTokenSecret: string;
  private readonly refreshTokenExpirationTime: number;
  constructor(
    private readonly configService: ConfigService,
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    @Inject(TOKENS_REPOSITORY)
    private readonly tokensRepository: TokensRepository,
    private readonly jwtService: JwtService,
    private readonly twoFactorAuthService: TwoFactorAuthService,
  ) {
    this.pepper = this.configService.getOrThrow<string>('PASSWORD_PEPPER');
    this.accessTokenName =
      this.configService.getOrThrow<string>('ACCESS_TOKEN_NAME');
    this.refreshTokenName =
      this.configService.getOrThrow<string>('REFRESH_TOKEN_NAME');
    this.refreshTokenPath =
      this.configService.getOrThrow<string>('REFRESH_TOKEN_PATH');
    this.authProviderRedirectUrl = this.configService.getOrThrow<string>(
      'CLIENT_AUTH_PROVIDER_REDIRECT_URL',
    );
    this.accessTokenSecret = this.configService.getOrThrow<string>(
      'JWT_ACCESS_TOKEN_SECRET',
    );
    this.accessTokenExpirationTime = this.configService.getOrThrow<number>(
      'JWT_ACCESS_TOKEN_EXPIRATION_TIME',
    );
    this.refreshTokenSecret = this.configService.getOrThrow<string>(
      'JWT_REFRESH_TOKEN_SECRET',
    );
    this.refreshTokenExpirationTime = this.configService.getOrThrow<number>(
      'JWT_REFRESH_TOKEN_EXPIRATION_TIME',
    );
  }

  async login(
    currentUser: AttachedUser,
    response: FastifyReply,
  ): Promise<User> {
    try {
      const tokens = await this.getTokens(currentUser);
      const [user] = await Promise.all([
        this.usersRepository.findById(currentUser.id),
        this.updateRtToken(currentUser.email, tokens.refresh_token),
      ]);

      response.cookie(this.accessTokenName, tokens.access_token, {
        httpOnly: true,
        sameSite: 'none',
        secure: process.env.MODE === 'production',
        path: '/',
        expires: this.getExpiresTimeAT(),
      });

      response.cookie(this.refreshTokenName, tokens.refresh_token, {
        httpOnly: true,
        sameSite: 'none',
        secure: process.env.MODE === 'production',
        path: this.refreshTokenPath,
        expires: this.getExpiresTimeRT(),
      });

      return user;
    } catch (error) {
      throw error;
    }
  }

  async loginWithProvider(
    currentUser: AttachedUser,
    response: FastifyReply,
  ): Promise<void> {
    try {
      const tokens = await this.getTokens(currentUser);
      await this.updateRtToken(currentUser.email, tokens.refresh_token);
      response.redirect(
        this.authProviderRedirectUrl +
          '?access_token=' +
          tokens.access_token +
          '&refresh_token=' +
          tokens.refresh_token,
      );
    } catch (error) {
      throw error;
    }
  }

  async logout(
    currentUser: AttachedUser,
    response: FastifyReply,
  ): Promise<AttachedUser> {
    try {
      await this.deleteRtToken(currentUser.email);

      response.clearCookie('Authentication_accessToken', {
        httpOnly: true,
        expires: new Date(),
        sameSite: 'lax',
        path: '/',
      });

      response.clearCookie('Authentication_refreshToken', {
        httpOnly: true,
        expires: new Date(),
        sameSite: 'lax',
        path: this.refreshTokenPath,
      });

      return currentUser;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ForbiddenException('Access Denied');
      }
      throw error;
    }
  }

  async refreshTokens(
    currentUser: AttachedUserWithRt,
    response: FastifyReply,
  ): Promise<AtRtTokens> {
    let refreshToken: Token;
    try {
      await this.usersRepository.findById(currentUser.id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ForbiddenException('Access Denied');
      }
      throw error;
    }

    try {
      refreshToken = await this.tokensRepository.findOneByCondition({
        email: currentUser.email,
        tokenType: TokenTypeEnum.REFRESH,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ForbiddenException('Access Denied');
      }
      throw error;
    }

    const rtMatches = await bcrypt.compare(
      currentUser.refreshToken,
      refreshToken.tokenValue,
    );

    if (!rtMatches) throw new ForbiddenException('Access Denied');

    try {
      const tokens = await this.getTokens(currentUser);
      await this.updateRtToken(currentUser.email, tokens.refresh_token);

      response.cookie('Authentication_accessToken', tokens.access_token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        expires: this.getExpiresTimeAT(),
      });

      response.cookie('Authentication_refreshToken', tokens.refresh_token, {
        httpOnly: true,
        sameSite: 'lax',
        path: this.refreshTokenPath,
        expires: this.getExpiresTimeRT(),
      });
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      };
    } catch (error) {
      throw error;
    }
  }

  async validateUserLocal(
    email: string,
    password: string,
    twoFactorVerificationCode?: string,
  ): Promise<AttachedUser | { message: string }> {
    try {
      const userExists = await this.usersRepository.findOneByCondition({
        email: email,
      });

      if (
        !userExists.password ||
        !userExists.registrationSources.includes(RegistrationSources.Local)
      ) {
        throw new ForbiddenException('Access Denied');
      }

      const passwordMatches = await bcrypt.compare(
        password + this.pepper,
        userExists.password,
      );

      if (!passwordMatches) throw new ForbiddenException('Access Denied');

      if (userExists.isTwoFactorEnabled) {
        if (!twoFactorVerificationCode) {
          await this.twoFactorAuthService.sendTwoFactorToken(email);

          return {
            message:
              'Check your mail. Coded two-factor authentication required.',
          };
        }

        await this.twoFactorAuthService.validateTwoFactorToken(
          email,
          twoFactorVerificationCode,
        );
      }

      return {
        id: userExists.id,
        email: userExists.email,
        permissions: userExists.permissions,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ForbiddenException('Access Denied');
      }
      throw error;
    }
  }

  async validateUserOAuth(
    profile: any,
    provider: RegistrationSources,
  ): Promise<AttachedUser> {
    let parseUserOAuth: ParseUserOAuth;

    let existUser: User;
    switch (provider) {
      case RegistrationSources.Google: {
        parseUserOAuth = this.parseGoogleUser(profile);
        break;
      }
      case RegistrationSources.GitHub: {
        parseUserOAuth = this.parseGitHubUser(profile);
        break;
      }
      default:
        throw new InternalServerErrorException('Invalid provider');
    }

    try {
      existUser = await this.usersRepository.findOneByCondition({
        email: parseUserOAuth.email,
      });
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }

    if (!existUser) {
      try {
        existUser = await this.usersRepository.createUserOAuth(parseUserOAuth);
      } catch (error) {
        throw error;
      }
    }

    return {
      id: existUser.id,
      email: existUser.email,
      permissions: existUser.permissions,
    };
  }

  private async updateRtToken(email: string, rt: string): Promise<void> {
    try {
      await this.deleteRtToken(email);

      const hash = await bcrypt.hash(rt, 10);
      const token = {
        email,
        tokenValue: hash,
        tokenType: TokenTypeEnum.REFRESH,
      };

      await this.tokensRepository.create(token);
    } catch (error) {
      throw error;
    }
  }
  private async getTokens(
    currentUser: AttachedUser | AttachedUserWithRt,
  ): Promise<AtRtTokens> {
    const jwtPayload: JwtPayload = {
      sub: currentUser.id,
      email: currentUser.email,
      permissions: currentUser.permissions,
    };

    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: this.accessTokenSecret,
        expiresIn: this.accessTokenExpirationTime,
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: this.refreshTokenSecret,
        expiresIn: this.refreshTokenExpirationTime,
      }),
    ]);

    return {
      access_token: at,
      refresh_token: rt,
    };
  }

  private getExpiresTimeAT(): Date {
    const expiresTime = new Date();
    expiresTime.setTime(
      expiresTime.getTime() +
        this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME') * 1000,
    );

    return expiresTime;
  }
  private getExpiresTimeRT(): Date {
    const expiresTime = new Date();
    expiresTime.setTime(
      expiresTime.getTime() + this.accessTokenExpirationTime * 1000,
    );

    return expiresTime;
  }
  private parseGoogleUser(profile: any): ParseUserOAuth {
    const {
      displayName: name,
      emails: [{ value: email }],
      photos: [{ value: icon }],
    } = profile;

    return {
      name,
      email,
      icon,
      registrationSources: [RegistrationSources.Google],
    };
  }

  private parseGitHubUser(profile: any): ParseUserOAuth {
    const {
      username: name,
      emails: [{ value: email }],
      photos: [{ value: icon }],
    } = profile;

    return {
      name,
      email,
      icon,
      registrationSources: [RegistrationSources.GitHub],
    };
  }

  private async deleteRtToken(email: string): Promise<void> {
    try {
      await this.tokensRepository.deleteByCondition({
        email,
        tokenType: TokenTypeEnum.REFRESH,
      });
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }
  }
}
