import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { UUID } from 'crypto';

export class UpdateFolderDto {
  @IsUUID()
  @IsNotEmpty()
  readonly folderId: UUID;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  folderName?: string;

  @Transform(({ value }) => (value === 'null' ? null : value))
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  readonly parentFolderId?: UUID | null;
}
