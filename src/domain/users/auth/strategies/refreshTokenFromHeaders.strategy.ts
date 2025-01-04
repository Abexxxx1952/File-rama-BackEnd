import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { FastifyRequest } from 'fastify';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AttachedUserWithRt } from '../types/attached-user-withRt';
import { JwtPayload } from '../types/jwtPayload';

@Injectable()
export class RefreshTokenFromHeadersStrategy extends PassportStrategy(
  Strategy,
  'refreshFromHeaders',
) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(request: FastifyRequest, payload: JwtPayload): AttachedUserWithRt {
    const refreshToken = request.headers?.authorization?.split(' ')[1];

    return {
      id: payload.sub,
      email: payload.email,
      permissions: payload.permissions,
      refreshToken,
    };
  }
}
