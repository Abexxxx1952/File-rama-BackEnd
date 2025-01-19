import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateFileDto {
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
  readonly parentFolderId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly fileDescription?: string;
}
