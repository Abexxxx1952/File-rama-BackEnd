import { ApiProperty } from '@nestjs/swagger';
import { GoogleServiceAccounts } from '@/domain/users/types/google-service-accounts';

export class GoogleServiceAccountsModel implements GoogleServiceAccounts {
  @ApiProperty()
  clientEmail: string;
  @ApiProperty()
  privateKey: string;
  @ApiProperty()
  rootFolderId: string;
}
