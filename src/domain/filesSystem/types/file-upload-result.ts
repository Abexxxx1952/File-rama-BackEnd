import { File } from './file';
import { StatusUpload } from './file-upload-event';

export interface FileUploadCompleteResult {
  file: File;
  status: StatusUpload.COMPLETED;
  account: string;
}
export interface FileUploadFailedResult {
  status: StatusUpload.FAILED;
  error: string;
  fileName: string;
}

export type FileUploadResult =
  | FileUploadCompleteResult
  | FileUploadFailedResult;
