import { IsString } from 'class-validator';

export class GoogleServiceAccounts {
  @IsString()
  client_email: string;
  @IsString()
  private_key: string;
}
