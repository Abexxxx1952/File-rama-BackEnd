import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { drive_v3, google } from 'googleapis';
import { GoogleAuth, JWT } from 'googleapis-common';
import { User } from '@/domain/users/types/users';
import { GoogleAuthDto } from '../../dto/google-auth.dto';

@Injectable()
export class GoogleDriveClient {
  private authCache = new Map<string, GoogleAuth<JWT>>();
  private getAuth(authDto: GoogleAuthDto): GoogleAuth<JWT> {
    const key = authDto.clientEmail;

    if (!this.authCache.has(key)) {
      this.authCache.set(
        key,
        new google.auth.GoogleAuth({
          credentials: {
            client_email: authDto.clientEmail,
            private_key: authDto.privateKey.replace(/\\n/g, '\n'),
          },
          scopes: ['https://www.googleapis.com/auth/drive'],
        }),
      );
    }

    return this.authCache.get(key);
  }

  async authenticate(authDto: GoogleAuthDto): Promise<drive_v3.Drive> {
    const auth = this.getAuth(authDto);
    return google.drive({ version: 'v3', auth });
  }

  async getDrive(user: User, clientEmail: string): Promise<drive_v3.Drive> {
    const account = user.googleServiceAccounts.find(
      (account) => account.clientEmail === clientEmail,
    );

    if (!account) {
      throw new ForbiddenException('Google service account not found');
    }

    return await this.authenticate(account);
  }
}
