import { Exclude } from 'class-transformer';

export class GoogleServiceAccounts {
  clientEmail: string;

  @Exclude()
  privateKey: string;

  rootFolderId?: string;
}
