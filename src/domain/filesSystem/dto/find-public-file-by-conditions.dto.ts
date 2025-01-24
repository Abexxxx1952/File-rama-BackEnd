import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { UUID } from 'crypto';

export class FindFilesByConditionsDto {
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  readonly id?: UUID;

  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  readonly userId?: UUID;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly fileUrl?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly fileDownloadUrl?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly fileName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly fileExtension?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly fileSize?: string;

  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  readonly parentFolderId?: UUID;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fileGoogleDriveId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fileGoogleDriveParentFolderId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fileGoogleDriveClientEmail: string;

  @IsOptional()
  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  readonly uploadDate?: Date;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly fileDescription?: string;
}
