import { ApiProperty } from '@nestjs/swagger';
import { File } from '@/domain/filesSystem/types/file';
import { UploadStatus } from '@/domain/filesSystem/types/file-upload-event';
import {
  FileUploadCompleteResult,
  FileUploadFailedResult,
} from '@/domain/filesSystem/types/file-upload-result';
import { FileModel } from './file';

export class FileUploadCompleteModel implements FileUploadCompleteResult {
  @ApiProperty({ type: () => FileModel })
  file: File;
  @ApiProperty({
    enum: UploadStatus,
  })
  status: UploadStatus.COMPLETED;
  @ApiProperty()
  account: string;
}

export class FileUploadFailedResultModel implements FileUploadFailedResult {
  @ApiProperty()
  fileName: string;
  @ApiProperty({
    enum: UploadStatus,
  })
  status: UploadStatus.FAILED;
  @ApiProperty()
  error: string;
}
