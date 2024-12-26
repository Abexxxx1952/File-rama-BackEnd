import { UsersPermissionsKeys } from '../../permissions/users-permissions';

export type JwtPayload = {
  sub: string;
  email: string;
  permissions: UsersPermissionsKeys[];
};
