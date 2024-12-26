import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AttachedUser } from '../types/attachedUser';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'access') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any) => {
          return request?.cookies?.Authentication_accessToken;
        },
      ]),
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
