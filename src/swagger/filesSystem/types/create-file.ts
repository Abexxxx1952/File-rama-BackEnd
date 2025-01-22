import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Readable } from 'stream';

export class CreateFileArgs {
  @ApiPropertyOptional()
  conflictChoice?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  parentFolderId?: string;

  @ApiPropertyOptional()
  parentFolderGoogleDriveId?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File buffer or stream to be uploaded',
  })
  file: Buffer | Readable;
}
