export enum StatusUpload {
  FAILED = 'FAILED',
  UPLOADING = 'UPLOADING',
  COMPLETED = 'COMPLETED',
}

export class FileUploadEvent {
  fileName: string;
  progress: number;
  status: StatusUpload;
  error: string | null;
}
