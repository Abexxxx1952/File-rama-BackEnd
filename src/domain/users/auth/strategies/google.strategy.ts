import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';
import { RegistrationSources } from '../types/providers-oauth.enum';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_OAUTH2_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>(
        'GOOGLE_OAUTH2_CLIENT_SECRET',
      ),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),

      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessTokenFromGoogle: string,
    _refreshTokenFromGoogle: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const user = await this.authService.validateUserOAuth(
        profile,
        RegistrationSources.Google,
      );
      done(null, user);
    } catch (err) {
      done(err, false);
    }
  }
}
