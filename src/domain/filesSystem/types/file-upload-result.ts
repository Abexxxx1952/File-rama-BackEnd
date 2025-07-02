import { File } from './file';
import { UploadStatus } from './file-upload-event';

export interface FileUploadCompleteResult {
  file: File;
  status: UploadStatus.COMPLETED;
  account: string;
}
export interface FileUploadFailedResult {
  status: UploadStatus.FAILED;
  error: string;
  fileName: string;
}

export type FileUploadResult =
  | FileUploadCompleteResult
  | FileUploadFailedResult;
