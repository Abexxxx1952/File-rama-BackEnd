import { IsString } from 'class-validator';

export class GoogleServiceAccounts {
  @IsString()
  clientEmail: string;
  @IsString()
  privateKey: string;
  @IsString()
  rootFolderId: string;
}
