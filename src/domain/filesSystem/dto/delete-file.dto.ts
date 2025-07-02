import { IsNotEmpty, IsUUID } from 'class-validator';
import { UUID } from 'crypto';

export class DeleteFileDto {
  @IsUUID()
  @IsNotEmpty()
  readonly fileId: UUID;
}
