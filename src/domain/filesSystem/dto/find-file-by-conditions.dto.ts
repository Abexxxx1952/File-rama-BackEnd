import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class FindFilesByConditionsDto {
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  readonly id?: string;

  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  readonly userId?: string;

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
  @IsString()
  @IsNotEmpty()
  readonly parentFolderId?: string;

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
