import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AttachedUser } from '../types/attachedUser';

@Injectable()
export class AccessTokenFromHeadersStrategy extends PassportStrategy(
  Strategy,
  'accessFromHeaders',
) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET'),
    });
  }

  validate(payload: any): AttachedUser {
    return {
      id: payload.sub,
      email: payload.email,
      permissions: payload.permissions,
    };
  }
}
