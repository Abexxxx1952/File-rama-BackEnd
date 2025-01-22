import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateFolderDto } from '@/domain/filesSystem/dto/create-folder.dto';
import { NameConflictChoice } from '@/domain/filesSystem/types/upload-name-conflict';

export class CreateFolderArgs implements CreateFolderDto {
  @ApiProperty()
  readonly folderName: string;

  @ApiPropertyOptional({ type: 'string', format: 'UUID' })
  readonly parentFolderId?: string;

  @ApiPropertyOptional({ enum: NameConflictChoice })
  readonly conflictChoice?: NameConflictChoice;
}
