import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from '../auth.service';
import { RegistrationSources } from '../types/providers-oauth.enum';

interface GoogleAuthQuery {
  code?: string;
}

@Injectable()
export class GoogleAuthGuard implements CanActivate {
  private readonly clientID: string;
  private readonly clientSecret: string;
  private readonly callbackURL: string;
  private readonly scope: string[];

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    this.clientID = configService.getOrThrow<string>('GOOGLE_OAUTH2_CLIENT_ID');
    this.clientSecret = configService.getOrThrow<string>(
      'GOOGLE_OAUTH2_CLIENT_SECRET',
    );
    this.callbackURL = configService.getOrThrow<string>('GOOGLE_CALLBACK_URL');
    this.scope = ['email', 'profile'];
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();

    const query = request.query as GoogleAuthQuery;
    const code = query.code;

    if (!code) {
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.clientID}&scope=${this.scope.join('%20')}&redirect_uri=${encodeURIComponent(this.callbackURL)}&response_type=code`;
      response.redirect(authUrl);
      return false;
    }

    try {
      const tokenResponse = await this.fetchGoogleToken(code);
      const accessToken = tokenResponse.access_token;

      const profile = await this.fetchGoogleUserProfile(accessToken);

      const user = await this.authService.validateUserOAuth(
        profile,
        RegistrationSources.Google,
      );

      request.user = user;

      return true;
    } catch (error) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
  }

  private async fetchGoogleToken(
    code: string,
  ): Promise<{ access_token: string }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientID,
        client_secret: this.clientSecret,
        code: code,
        redirect_uri: this.callbackURL,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Google token');
    }

    return response.json();
  }

  private async fetchGoogleUserProfile(accessToken: string): Promise<any> {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Google user profile');
    }

    return response.json();
  }
}
