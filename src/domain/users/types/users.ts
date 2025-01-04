import { Exclude } from 'class-transformer';
import { InferSelectModel } from 'drizzle-orm';
import { RegistrationSources } from '../auth/types/providers-oauth.enum';
import { UsersPermissionsKeys } from '../permissions/users-permissions';
import { usersSchema } from '../schema/users.schema';
import { GoogleServiceAccounts } from './google-service-accounts';
import { Payloads } from './payloads';

type UserInferSelect = InferSelectModel<typeof usersSchema>;

type UserWithOptionalFields = Omit<
  UserInferSelect,
  'name' | 'icon' | 'updatedAt'
> & {
  name?: string;
  icon?: string;
  updatedAt?: Date;
};

export class User implements UserWithOptionalFields {
  id: string;

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

  permissions: UsersPermissionsKeys[];

  registrationSources: RegistrationSources[];

  isVerified: boolean;

  isTwoFactorEnabled: boolean;
}
