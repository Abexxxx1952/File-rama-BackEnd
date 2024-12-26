import { Exclude } from 'class-transformer';
import { usersSchema } from '../schema/users.schema';
import { UsersPermissionsKeys } from '../permissions/users-permissions';
import { RegistrationSources } from '../auth/types/providersOAuth.enum';
import { Payload } from './payload';
import { InferSelectModel } from 'drizzle-orm';

type UserInferSelect = InferSelectModel<typeof usersSchema>;

type UserWithOptionalFields = Omit<
  UserInferSelect,
  'name' | 'icon' | 'updatedAt' | 'hashedRefreshToken'
> & {
  name?: string;
  icon?: string;
  updatedAt?: Date;
  hashedRefreshToken?: string;
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

  @Exclude()
  hashedRefreshToken?: string;

  payload: Payload[];

  permissions: UsersPermissionsKeys[];

  registrationSources: RegistrationSources[];
}
