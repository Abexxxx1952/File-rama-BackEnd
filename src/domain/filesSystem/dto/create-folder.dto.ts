import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { NameConflictChoice } from '../types/upload-name-conflict';

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty()
  readonly folderName: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly parentFolderId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsEnum(NameConflictChoice)
  readonly conflictChoice?: NameConflictChoice;
}
