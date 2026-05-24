import { Transform } from 'class-transformer';
import { IsOptional, IsUUID } from 'class-validator';
import { UUID } from 'crypto';

export abstract class UpdateBaseDto {
  @Transform(({ value }) => (value === 'null' || value === '' ? null : value))
  @IsOptional()
  @IsUUID()
  readonly parentFolderId?: UUID | null;
}
