import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { Folder } from '@/domain/filesSystem/types/folder';

export class FolderModel implements Folder {
  @ApiProperty({ type: 'string', format: 'UUID' })
  id: UUID;
  @ApiProperty()
  folderName: string;
  @ApiProperty({ type: 'string', format: 'UUID' })
  userId: UUID;
  @ApiProperty({ type: 'string', format: 'UUID' })
  parentFolderId: UUID;
  @ApiProperty()
  createdDate: Date;
  @ApiProperty()
  isPublic: boolean;
}
