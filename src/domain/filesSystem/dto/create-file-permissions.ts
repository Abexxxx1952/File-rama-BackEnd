import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { UUID } from 'crypto';

export enum UpdateRole {
  READER = 'reader',
  WRITER = 'writer',
}

export class CreateFilePermissionsDto {
  @IsUUID()
  @IsNotEmpty()
  readonly fileId: UUID;

  @IsString()
  @IsNotEmpty()
  @IsEnum(UpdateRole)
  readonly role: UpdateRole;
}
