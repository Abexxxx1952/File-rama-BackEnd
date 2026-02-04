import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { UUID } from 'crypto';
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

  @Transform(({ value }) => (value === 'null' ? null : value))
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  readonly parentFolderId?: UUID | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly parentFolderGoogleDriveId?: string;
}
