import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { UUID } from 'crypto';

export class ParentFolderIdDto {
  @Transform(({ value }) => (value === 'null' ? null : value))
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  readonly parentFolderId?: UUID | null;
}
