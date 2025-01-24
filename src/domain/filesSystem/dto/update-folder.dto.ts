import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { UUID } from 'crypto';

export class UpdateFolderDto {
  @IsUUID()
  @IsNotEmpty()
  readonly folderId: UUID;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly folderName?: string;

  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  readonly parentFolderId?: UUID;
}
