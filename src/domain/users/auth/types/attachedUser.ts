import { UsersPermissionsKeys } from '../../permissions/users-permissions';

export class AttachedUser {
  readonly id: string;
  readonly email: string;
  readonly permissions: UsersPermissionsKeys[];
}
