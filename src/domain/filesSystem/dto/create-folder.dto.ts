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

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty()
  readonly folderName: string;

  @Transform(({ value }) => (value === 'null' ? null : value))
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  readonly parentFolderId?: UUID | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsEnum(NameConflictChoice)
  readonly conflictChoice?: NameConflictChoice;
}
