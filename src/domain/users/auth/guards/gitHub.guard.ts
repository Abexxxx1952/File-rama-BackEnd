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

interface GitHubAuthQuery {
  code?: string;
}
@Injectable()
export class GitHubAuthGuard implements CanActivate {
  private readonly clientID: string;
  private readonly clientSecret: string;
  private readonly callbackURL: string;
  private readonly scope: string[];

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    this.clientID = configService.getOrThrow<string>('GITHUB_OAUTH2_CLIENT_ID');
    this.clientSecret = configService.getOrThrow<string>(
      'GITHUB_OAUTH2_CLIENT_SECRET',
    );
    this.callbackURL = configService.getOrThrow<string>('GITHUB_CALLBACK_URL');
    this.scope = ['user:email'];
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();

    const query = request.query as GitHubAuthQuery;
    const code = query.code;

    if (!code) {
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${this.clientID}&scope=${this.scope.join('%20')}&redirect_uri=${encodeURIComponent(this.callbackURL)}`;
      response.redirect(authUrl);
      return false;
    }

    try {
      const tokenResponse = await this.fetchGitHubToken(code);
      const accessToken = tokenResponse.access_token;

      const profile = await this.fetchGitHubUserProfile(accessToken);

      const user = await this.authService.validateUserOAuth(
        profile,
        RegistrationSources.GitHub,
      );

      request.user = user;

      return true;
    } catch (error) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
  }

  private async fetchGitHubToken(
    code: string,
  ): Promise<{ access_token: string }> {
    const response = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientID,
          client_secret: this.clientSecret,
          code: code,
          redirect_uri: this.callbackURL,
        }),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch GitHub token');
    }

    return response.json();
  }

  private async fetchGitHubUserProfile(accessToken: string): Promise<any> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch GitHub user profile');
    }

    return response.json();
  }
}
