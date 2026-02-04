import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { CreateFolderDto } from '@/domain/filesSystem/dto/create-folder.dto';
import { NameConflictChoice } from '@/domain/filesSystem/types/upload-name-conflict';

export class CreateFolderArgs implements CreateFolderDto {
  @ApiProperty()
  readonly folderName: string;

  @ApiPropertyOptional({ type: 'string', format: 'UUID' })
  readonly parentFolderId?: UUID;

  @ApiPropertyOptional({ enum: NameConflictChoice })
  readonly conflictChoice?: NameConflictChoice;
}
