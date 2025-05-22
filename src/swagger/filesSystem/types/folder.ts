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

/* export const folderSchema: SchemaObject = {
  title: 'Folder',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      description: 'Unique identifier for the folder',
    },
    folderName: {
      type: 'string',
      description: 'Name of the folder',
    },
    userId: {
      type: 'string',
      format: 'uuid',
      description: 'Identifier of the user who owns the folder',
    },
    parentFolderId: {
      type: 'string',
      format: 'uuid',
      nullable: true,
      description: 'Parent folder ID, if applicable',
    },
  },
  required: ['id', 'folderName', 'userId', 'parentFolderId'],
};
 */
