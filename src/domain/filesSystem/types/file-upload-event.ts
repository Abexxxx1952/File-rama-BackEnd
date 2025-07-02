export enum UploadStatus {
  FAILED = 'FAILED',
  UPLOADING = 'UPLOADING',
  COMPLETED = 'COMPLETED',
}

export class FileUploadEvent {
  fileName: string;
  progress: number;
  status: UploadStatus;
  error: string | null;
}
