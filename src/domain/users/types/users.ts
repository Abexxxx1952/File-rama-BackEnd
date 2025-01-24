import { Exclude } from 'class-transformer';
import { UUID } from 'crypto';
import { InferSelectModel } from 'drizzle-orm';
import { MakeOptional } from '@/database/types/make-optional';
import { RegistrationSources } from '../auth/types/providers-oauth.enum';
import { UsersPermissionsKeys } from '../permissions/users-permissions';
import { usersSchema } from '../schema/users.schema';
import { GoogleServiceAccounts } from './google-service-accounts';
import { Payloads } from './payloads';

type UserInferSelect = InferSelectModel<typeof usersSchema>;

type UserWithOptionalFields = MakeOptional<
  UserInferSelect,
  'name' | 'icon' | 'updatedAt'
>;

export class User implements UserWithOptionalFields {
  id: UUID;

  name?: string;

  email: string;

  @Exclude()
  password: string;

  icon?: string;

  createdAt: Date;

  updatedAt?: Date;

  payloads: Payloads[];

  googleServiceAccounts: GoogleServiceAccounts[];

  permissions: UsersPermissionsKeys[];

  registrationSources: RegistrationSources[];

  isVerified: boolean;

  isTwoFactorEnabled: boolean;
}

export class UserPoor implements UserWithOptionalFields {
  id: UUID;

  name?: string;

  email: string;

  @Exclude()
  password: string;

  icon?: string;

  createdAt: Date;

  updatedAt?: Date;

  payloads: Payloads[];

  @Exclude()
  googleServiceAccounts: GoogleServiceAccounts[];

  @Exclude()
  permissions: UsersPermissionsKeys[];

  @Exclude()
  registrationSources: RegistrationSources[];

  @Exclude()
  isVerified: boolean;

  @Exclude()
  isTwoFactorEnabled: boolean;
}
