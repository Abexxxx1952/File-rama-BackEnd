import { ApiProperty } from '@nestjs/swagger';
import { GoogleServiceAccounts } from '@/domain/users/types/google-service-accounts';

export class GoogleServiceAccountsModel implements GoogleServiceAccounts {
  @ApiProperty()
  client_email: string;
  @ApiProperty()
  private_key: string;
}
