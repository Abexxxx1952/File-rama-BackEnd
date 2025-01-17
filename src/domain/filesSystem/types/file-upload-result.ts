import { StatusUpload } from './file-upload-event';

export class FileUploadResult {
  fileName: string;
  fileId?: string;
  downloadLink?: string;
  webViewLink?: string;
  size?: string;
  status: StatusUpload;
  account?: string;
  error?: string;
}
