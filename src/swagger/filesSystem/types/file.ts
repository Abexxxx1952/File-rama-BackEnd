import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { publicAccessRole } from '@/domain/filesSystem/dto/create-file-permissions';
import { File } from '@/domain/filesSystem/types/file';

export class FileModel implements File {
  @ApiProperty({
    description: 'Unique identifier for the file',
    format: 'uuid',
  })
  id: UUID;

  @ApiProperty({
    description: 'Identifier of the user who owns the file',
    format: 'uuid',
  })
  userId: UUID;

  @ApiProperty({ description: 'URL of the file' })
  fileUrl: string;

  @ApiProperty({ description: 'Download URL of the file' })
  fileDownloadUrl: string;

  @ApiProperty({ description: 'Name of the file' })
  fileName: string;

  @ApiProperty({ description: 'File extension (e.g., .txt, .pdf)' })
  fileExtension: string;

  @ApiProperty({ description: 'Size of the file in bytes' })
  fileSize: number;

  @ApiProperty({
    description: 'Parent folder ID, if applicable',
    format: 'uuid',
  })
  parentFolderId: UUID;

  @ApiProperty({ description: 'Google Drive ID of the file' })
  fileGoogleDriveId: string;

  @ApiProperty({ description: 'Google Drive Parent Folder ID' })
  fileGoogleDriveParentFolderId: string;

  @ApiProperty({
    description: 'Google Drive client email associated with the file',
  })
  fileGoogleDriveClientEmail: string;

  @ApiProperty({
    description: 'Date the file was uploaded',
    format: 'date-time',
  })
  uploadDate: Date;

  @ApiProperty({
    description:
      'Indicates if the file is publicly accessible (no access, read or write)',
  })
  publicAccessRole: publicAccessRole;

  @ApiPropertyOptional({
    description: 'Optional description of the file',
    nullable: true,
  })
  fileDescription?: string;
}

/* export const fileSchema: SchemaObject = {
  title: 'File',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      description: 'Unique identifier for the file',
    },
    userId: {
      type: 'string',
      format: 'uuid',
      description: 'Identifier of the user who owns the file',
    },
    fileUrl: {
      type: 'string',
      description: 'URL of the file',
    },
    fileDownloadUrl: {
      type: 'string',
      description: 'Download URL of the file',
    },
    fileName: {
      type: 'string',
      description: 'Name of the file',
    },
    fileExtension: {
      type: 'string',
      description: 'File extension (e.g., .txt, .pdf)',
    },
    fileSize: {
      type: 'string',
      description: 'Size of the file in bytes',
    },
    parentFolderId: {
      type: 'string',
      format: 'uuid',
      nullable: true,
      description: 'Parent folder ID, if applicable',
    },
    fileGoogleDriveId: {
      type: 'string',
      description: 'Google Drive ID of the file',
    },
    fileGoogleDriveParentFolderId: {
      type: 'string',
      description: 'Google Drive Parent Folder ID',
    },
    fileGoogleDriveClientEmail: {
      type: 'string',
      description: 'Google Drive client email associated with the file',
    },
    uploadDate: {
      type: 'string',
      format: 'date-time',
      description: 'Date the file was uploaded',
    },
    isPublic: {
      type: 'boolean',
      description: 'Indicates if the file is publicly accessible',
    },
    fileDescription: {
      type: 'string',
      nullable: true,
      description: 'Optional description of the file',
    },
  },
  required: [
    'id',
    'userId',
    'fileUrl',
    'fileDownloadUrl',
    'fileName',
    'fileExtension',
    'fileSize',
    'fileGoogleDriveId',
    'fileGoogleDriveParentFolderId',
    'fileGoogleDriveClientEmail',
    'uploadDate',
    'isPublic',
  ],
};
 */
