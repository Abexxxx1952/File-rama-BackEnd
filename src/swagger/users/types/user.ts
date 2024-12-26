import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../../domain/users/types/users';
import { Payload } from '../../../domain/users/types/payload';
import { UsersPermissionsKeys } from '../../../domain/users/permissions/users-permissions';
import { RegistrationSources } from '../../../domain/users/auth/types/providersOAuth.enum';

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

  hashedRefreshToken?: string;

  @ApiProperty({ type: () => PayloadModel, isArray: true })
  payload: Payload[];

  @ApiProperty()
  permissions: UsersPermissionsKeys[];

  @ApiProperty()
  registrationSources: RegistrationSources[];
}

export class PayloadModel implements Payload {
  @ApiProperty()
  key: string;

  @ApiProperty()
  value: string;
}
