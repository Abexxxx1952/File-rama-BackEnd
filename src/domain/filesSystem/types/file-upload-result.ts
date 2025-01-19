import { File } from './file';
import { StatusUpload } from './file-upload-event';

export class FileUploadResult {
  file?: File;
  fileName?: string;
  status: StatusUpload;
  account?: string;
  error?: string;
}
