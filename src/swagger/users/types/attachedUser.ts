import { ApiProperty } from '@nestjs/swagger';
import {
  UsersPermissions,
  UsersPermissionsKeys,
} from '../../../domain/users/permissions/users-permissions';
import { AttachedUser } from '../../../domain/users/auth/types/attachedUser';

export class AttachedUserModel implements AttachedUser {
  @ApiProperty({ type: 'string', format: 'UUID' })
  readonly id: string;
  @ApiProperty({ type: 'string', format: 'email' })
  readonly email: string;
  @ApiProperty({
    enum: [UsersPermissions],
  })
  readonly permissions: UsersPermissionsKeys[];
}
