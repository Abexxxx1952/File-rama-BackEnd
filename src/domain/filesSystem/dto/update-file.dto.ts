import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { UUID } from 'crypto';
import { UpdateBaseDto } from './update-base.dto';

export class UpdateFileDto extends UpdateBaseDto {
  @IsUUID()
  @IsNotEmpty()
  readonly fileId: UUID;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fileName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly fileDescription?: string;
}
