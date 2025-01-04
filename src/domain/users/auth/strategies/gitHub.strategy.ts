import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { VerifyCallback } from 'passport-oauth2';
import { AuthService } from '../auth.service';
import { RegistrationSources } from '../types/providers-oauth.enum';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'gitHub') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('GITHUB_OAUTH2_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>(
        'GITHUB_OAUTH2_CLIENT_SECRET',
      ),
      callbackURL: configService.getOrThrow<string>('GITHUB_CALLBACK_URL'),

      scope: ['user:email'],
    });
  }

  async validate(
    _accessTokenFromGitHub: string,
    _refreshTokenFromGitHub: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const user = await this.authService.validateUserOAuth(
        profile,
        RegistrationSources.GitHub,
      );
      done(null, user);
    } catch (err) {
      done(err, false);
    }
  }
}
