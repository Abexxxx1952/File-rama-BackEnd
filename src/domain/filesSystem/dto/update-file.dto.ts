import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { UUID } from 'crypto';

export class UpdateFileDto {
  @IsUUID()
  @IsNotEmpty()
  readonly fileId: UUID;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fileName?: string;

  @Transform(({ value }) => (value === 'null' ? null : value))
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  readonly parentFolderId?: UUID | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly fileDescription?: string;
}
