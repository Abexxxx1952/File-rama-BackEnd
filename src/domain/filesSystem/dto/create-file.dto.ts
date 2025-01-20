import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { NameConflictChoice } from '../types/upload-name-conflict';

export class CreateFileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsEnum(NameConflictChoice)
  readonly conflictChoice?: NameConflictChoice;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly parentFolderId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly parentFolderGoogleDriveId?: string;
}
