import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

enum UpdateRole {
  READER = 'reader',
  Writer = 'writer',
}

export class UpdateFilePermissionsDto {
  @IsString()
  @IsNotEmpty()
  readonly fileId: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(UpdateRole)
  readonly role: UpdateRole;
}
