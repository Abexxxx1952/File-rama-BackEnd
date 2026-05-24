import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { UUID } from 'crypto';
import { UpdateBaseDto } from './update-base.dto';

export class UpdateFolderDto extends UpdateBaseDto {
  @IsUUID()
  @IsNotEmpty()
  readonly folderId: UUID;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  folderName?: string;
}
