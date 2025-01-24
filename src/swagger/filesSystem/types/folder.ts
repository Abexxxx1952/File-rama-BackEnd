import { ApiProperty } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
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
}

export const folderSchema: SchemaObject = {
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
