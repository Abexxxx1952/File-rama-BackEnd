import { ApiProperty } from '@nestjs/swagger';
import { UpdateMode } from '@/domain/users/dto/google-service-accounts';
import { GoogleServiceAccounts } from '@/domain/users/types/google-service-accounts';

export class GoogleServiceAccountsModel implements GoogleServiceAccounts {
  @ApiProperty()
  clientEmail: string;
  @ApiProperty()
  privateKey: string;
  @ApiProperty()
  rootFolderId: string;
  @ApiProperty()
  updateMode: UpdateMode;
}
