import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { drive_v3, google } from 'googleapis';
import { GoogleAuth, JWT } from 'googleapis-common';
import { GoogleAuthDto } from '@/domain/filesSystem/dto/google-auth.dto';
import type { User } from '@/domain/users/types/users';

@Injectable()
export class GoogleDriveClient {
  private readonly AUTH_CACHE_TTL: number;
  constructor(private readonly configService: ConfigService) {
    this.AUTH_CACHE_TTL =
      this.configService.getOrThrow<number>('AUTH_CACHE_TTL');
  }
  private authCache = new Map<
    string,
    {
      auth: GoogleAuth;
      createdAt: number;
    }
  >();

  private createCacheKey(clientEmail: string, privateKey: string): string {
    return createHash('sha256')
      .update(`${clientEmail}:${privateKey}`)
      .digest('hex');
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();

    for (const [key, value] of this.authCache.entries()) {
      const expired = now - value.createdAt > this.AUTH_CACHE_TTL;

      if (expired) {
        this.authCache.delete(key);
      }
    }
  }

  private getAuth(authDto: GoogleAuthDto): GoogleAuth {
    this.cleanupExpiredCache();

    const cacheKey = this.createCacheKey(
      authDto.clientEmail,
      authDto.privateKey,
    );

    const cached = this.authCache.get(cacheKey);

    if (cached) {
      return cached.auth;
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: authDto.clientEmail,
        private_key: authDto.privateKey,
      },

      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    this.authCache.set(cacheKey, {
      auth,
      createdAt: Date.now(),
    });

    return auth;
  }

  authenticate(authDto: GoogleAuthDto): drive_v3.Drive {
    const auth = this.getAuth(authDto);

    return google.drive({ version: 'v3', auth });
  }

  getDrive(user: User, clientEmail: string): drive_v3.Drive {
    const account = user.googleServiceAccounts.find(
      (account) => account.clientEmail === clientEmail,
    );

    if (!account) {
      throw new ForbiddenException('Google service account not found');
    }

    return this.authenticate(account);
  }

  clearAuthCache(): void {
    this.authCache.clear();
  }

  clearAccountCache(clientEmail: string, privateKey: string): void {
    const key = this.createCacheKey(clientEmail, privateKey);

    this.authCache.delete(key);
  }
}
