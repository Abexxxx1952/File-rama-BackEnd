import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateFolderDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly folderName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly parentFolderId?: string;
}
