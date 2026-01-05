import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { AttachedUserWithRt } from '../types/attached-user-withRt';
import { JwtPayload } from '../types/jwtPayload';

@Injectable()
export class RefreshTokenAuthGuardFromHeadersAndCookies {
  private readonly refreshTokenName: string;
  private readonly refreshTokenSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.refreshTokenName =
      this.configService.getOrThrow<string>('REFRESH_TOKEN_NAME');
    this.refreshTokenSecret = this.configService.getOrThrow<string>(
      'JWT_REFRESH_TOKEN_SECRET',
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const tokenFromHeaders = this.extractTokenFromHeaders(request);
    const tokenFromCookies = this.extractTokenFromCookies(request);

    const refreshToken = tokenFromHeaders || tokenFromCookies;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: this.refreshTokenSecret,
        },
      );

      request.user = this.validate(payload, refreshToken);
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private extractTokenFromHeaders(request: FastifyRequest): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.split(' ')[0] === 'Bearer') {
      return authHeader.split(' ')[1];
    }
    return null;
  }

  private extractTokenFromCookies(request: FastifyRequest): string | null {
    return request.cookies?.[this.refreshTokenName] || null;
  }

  private validate(
    payload: JwtPayload,
    refreshToken: string,
  ): AttachedUserWithRt {
    return {
      id: payload.sub,
      email: payload.email,
      permissions: payload.permissions,
      refreshToken,
    };
  }
}
