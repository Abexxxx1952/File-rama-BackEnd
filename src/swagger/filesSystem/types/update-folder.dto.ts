import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { UpdateFolderDto } from '@/domain/filesSystem/dto/update-folder.dto';

export class UpdateFolderArgs implements UpdateFolderDto {
  @ApiProperty({ type: 'string', format: 'UUID' })
  readonly folderId: UUID;

  @ApiPropertyOptional({ type: 'string', format: 'UUID' })
  readonly folderName?: string;

  @ApiPropertyOptional({ type: 'string', format: 'UUID' })
  readonly parentFolderId?: UUID;
}
