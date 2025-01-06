import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GoogleServiceAccounts } from '@/domain/users/types/google-service-accounts';
import { RegistrationSources } from '../../../domain/users/auth/types/providers-oauth.enum';
import { UsersPermissionsKeys } from '../../../domain/users/permissions/users-permissions';
import { Payloads } from '../../../domain/users/types/payloads';
import { User } from '../../../domain/users/types/users';
import { GoogleServiceAccountsModel } from './google-service-accounts';
import { PayloadModel } from './payload';

export class UserModel implements User {
  @ApiProperty({ type: 'string', format: 'UUID' })
  id: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiProperty()
  email: string;

  password: string;

  @ApiPropertyOptional()
  icon?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: () => PayloadModel, isArray: true })
  payloads: Payloads[];

  @ApiProperty({ type: () => GoogleServiceAccountsModel, isArray: true })
  googleServiceAccounts: GoogleServiceAccounts[];

  @ApiProperty()
  permissions: UsersPermissionsKeys[];

  @ApiProperty()
  registrationSources: RegistrationSources[];

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  isTwoFactorEnabled: boolean;
}

export class UserPoorModel implements User {
  @ApiProperty({ type: 'string', format: 'UUID' })
  id: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiProperty()
  email: string;

  password: string;

  @ApiPropertyOptional()
  icon?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: () => PayloadModel, isArray: true })
  payloads: Payloads[];

  googleServiceAccounts: GoogleServiceAccounts[];

  permissions: UsersPermissionsKeys[];

  registrationSources: RegistrationSources[];

  isVerified: boolean;

  isTwoFactorEnabled: boolean;
}
