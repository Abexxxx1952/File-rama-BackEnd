import { Exclude } from 'class-transformer';
import { usersSchema } from '../schema/users.schema';
import { UsersPermissionsKeys } from '../permissions/users-permissions';
import { RegistrationSources } from '../auth/types/providersOAuth.enum';
import { Payload } from './payload';

type UserInferSelect = typeof usersSchema.$inferSelect;

export class User implements UserInferSelect {
  id: string;

  name: string;

  email: string;

  @Exclude()
  password: string;

  icon: string;

  createdAt: Date;

  updatedAt: Date;

  @Exclude()
  hashedRefreshToken: string;

  payload: Payload[];

  permissions: UsersPermissionsKeys[];

  registrationSources: RegistrationSources[];
}
