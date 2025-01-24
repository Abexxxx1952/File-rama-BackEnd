import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { UUID } from 'crypto';

export class UpdateFileDto {
  @IsUUID()
  @IsNotEmpty()
  readonly fileId: UUID;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly fileName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly fileExtension?: string;

  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  readonly parentFolderId?: UUID;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly fileDescription?: string;
}
