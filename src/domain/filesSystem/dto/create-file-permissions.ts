import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { UUID } from 'crypto';

export type publicAccessRole = 'reader' | 'writer';

export class CreateFilePermissionsDto {
  @IsUUID()
  @IsNotEmpty()
  readonly fileId: UUID;

  @IsString()
  @IsNotEmpty()
  readonly role: publicAccessRole;
}
