import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { File } from '@/domain/filesSystem/types/file';
import { StatusUpload } from '@/domain/filesSystem/types/file-upload-event';
import { FileUploadResult } from '@/domain/filesSystem/types/file-upload-result';
import { FileModel } from './file';

export class FileUploadResultModel implements FileUploadResult {
  @ApiPropertyOptional({ type: () => FileModel })
  file?: File;
  @ApiPropertyOptional()
  fileName?: string;
  @ApiProperty({
    enum: StatusUpload,
  })
  status: StatusUpload;
  @ApiPropertyOptional()
  account?: string;
  @ApiPropertyOptional()
  error?: string;
}
