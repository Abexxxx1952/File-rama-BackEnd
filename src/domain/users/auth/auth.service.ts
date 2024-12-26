import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { FastifyReply } from 'fastify';
import * as bcrypt from 'bcrypt';
import { Tokens } from './types/tokens';
import { JwtPayload } from './types/jwtPayload';
import { UsersRepository } from '../repository/users.repository';
import { User } from '../types/users';
import { AttachedUser } from './types/attachedUser';
import { AttachedUserWithRt } from './types/attachedUserWithRt';
import { RegistrationSources } from './types/providersOAuth.enum';
import { ParseUserOAuth } from './types/parseUserOAuth';

@Injectable()
export class AuthService {
  private usersRepository: UsersRepository;
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async onModuleInit() {
    this.usersRepository = this.moduleRef.get('UsersRepository', {
      strict: false,
    });
  }

  async login(
    currentUser: AttachedUser,
    response: FastifyReply,
  ): Promise<User> {
    try {
      const tokens = await this.getTokens(currentUser);
      const [user] = await Promise.all([
        this.usersRepository.findById(currentUser.id),
        this.updateRtHash(currentUser.id, tokens.refresh_token),
      ]);

      response.cookie('Authentication_accessToken', tokens.access_token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        expires: this.getExpiresTimeAT(),
      });

      response.cookie('Authentication_refreshToken', tokens.refresh_token, {
        httpOnly: true,
        sameSite: 'lax',
        path: this.configService.getOrThrow<string>('REFRESH_TOKEN_PATH'),
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
      await this.updateRtHash(currentUser.id, tokens.refresh_token);
      response.redirect(
        this.configService.getOrThrow<string>(
          'CLIENT_AUTH_PROVIDER_REDIRECT_URL',
        ) +
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
      await this.usersRepository.updateById(currentUser.id, {
        hashedRefreshToken: '',
      });

      response.cookie('Authentication_accessToken', '', {
        httpOnly: true,
        expires: new Date(),
      });

      response.cookie('Authentication_refreshToken', '', {
        httpOnly: true,
        expires: new Date(),
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
  ): Promise<Tokens> {
    let userExist: User;
    try {
      userExist = await this.usersRepository.findById(currentUser.id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ForbiddenException('Access Denied');
      }
      throw error;
    }

    if (!userExist.hashedRefreshToken)
      throw new ForbiddenException('Access Denied');

    const rtMatches = await bcrypt.compare(
      currentUser.refreshToken,
      userExist.hashedRefreshToken,
    );

    if (!rtMatches) throw new ForbiddenException('Access Denied');

    try {
      const tokens = await this.getTokens(currentUser);
      await this.updateRtHash(userExist.id, tokens.refresh_token);

      response.cookie('Authentication_accessToken', tokens.access_token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        expires: this.getExpiresTimeAT(),
      });

      response.cookie('Authentication_refreshToken', tokens.refresh_token, {
        httpOnly: true,
        sameSite: 'lax',
        path: this.configService.getOrThrow<string>('REFRESH_TOKEN_PATH'),
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
  ): Promise<AttachedUser> {
    try {
      const userExists = await this.usersRepository.findOneByCondition({
        email: email,
      });

      if (
        !userExists.password ||
        !userExists.registrationSources.includes(RegistrationSources.Local)
      )
        throw new ForbiddenException('Access Denied');

      const passwordMatches = await bcrypt.compare(
        password,
        userExists.password,
      );

      if (!passwordMatches) throw new ForbiddenException('Access Denied');

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

  private async updateRtHash(userId: string, rt: string): Promise<void> {
    try {
      const hash = await bcrypt.hash(rt, 10);
      await this.usersRepository.updateById(userId, {
        hashedRefreshToken: hash,
      });
    } catch (error) {
      throw error;
    }
  }
  private async getTokens(
    currentUser: AttachedUser | AttachedUserWithRt,
  ): Promise<Tokens> {
    const jwtPayload: JwtPayload = {
      sub: currentUser.id,
      email: currentUser.email,
      permissions: currentUser.permissions,
    };

    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.getOrThrow<string>(
          'JWT_ACCESS_TOKEN_SECRET',
        ),
        expiresIn: this.configService.getOrThrow<number>(
          'JWT_ACCESS_TOKEN_EXPIRATION_TIME',
        ),
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.getOrThrow<string>(
          'JWT_REFRESH_TOKEN_SECRET',
        ),
        expiresIn: this.configService.getOrThrow<number>(
          'JWT_REFRESH_TOKEN_EXPIRATION_TIME',
        ),
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
      expiresTime.getTime() +
        this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION_TIME') * 1000,
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
}
