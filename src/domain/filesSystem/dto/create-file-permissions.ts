import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { UUID } from 'crypto';

enum UpdateRole {
  READER = 'reader',
  Writer = 'writer',
}

export class CreateFilePermissionsDto {
  @IsString()
  @IsNotEmpty()
  readonly fileId: UUID;

  @IsString()
  @IsNotEmpty()
  @IsEnum(UpdateRole)
  readonly role: UpdateRole;
}
