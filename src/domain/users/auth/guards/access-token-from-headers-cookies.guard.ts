import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { AttachedUser } from '../types/attachedUser';

@Injectable()
export class AccessTokenAuthGuardFromHeadersAndCookies {
  private readonly accessTokenSecret: string;
  private readonly accessTokenName: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.accessTokenSecret = this.configService.getOrThrow<string>(
      'JWT_ACCESS_TOKEN_SECRET',
    );
    this.accessTokenName =
      this.configService.getOrThrow<string>('ACCESS_TOKEN_NAME');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const tokenFromHeaders = this.extractTokenFromHeaders(request);
    const tokenFromCookies = this.extractTokenFromCookies(request);

    const accessToken = tokenFromHeaders || tokenFromCookies;

    if (!accessToken) {
      throw new UnauthorizedException('Token not found');
    }

    try {
      const payload = await this.jwtService.verifyAsync(accessToken, {
        secret: this.accessTokenSecret,
      });

      request.user = this.validate(payload);
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
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
    return request.cookies?.[this.accessTokenName] || null;
  }

  private validate(payload: any): AttachedUser {
    return {
      id: payload.sub,
      email: payload.email,
      permissions: payload.permissions,
    };
  }
}
