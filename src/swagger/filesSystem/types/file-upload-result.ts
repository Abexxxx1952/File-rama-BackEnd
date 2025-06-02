import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { File } from '@/domain/filesSystem/types/file';
import { StatusUpload } from '@/domain/filesSystem/types/file-upload-event';
import {
  FileUploadCompleteResult,
  FileUploadFailedResult,
  FileUploadResult,
} from '@/domain/filesSystem/types/file-upload-result';
import { FileModel } from './file';

export class FileUploadCompleteModel implements FileUploadCompleteResult {
  @ApiProperty({ type: () => FileModel })
  file: File;
  @ApiProperty({
    enum: StatusUpload,
  })
  status: StatusUpload.COMPLETED;
  @ApiProperty()
  account: string;
}

export class FileUploadFailedResultModel implements FileUploadFailedResult {
  @ApiProperty()
  fileName: string;
  @ApiProperty({
    enum: StatusUpload,
  })
  status: StatusUpload.FAILED;
  @ApiProperty()
  error: string;
}
