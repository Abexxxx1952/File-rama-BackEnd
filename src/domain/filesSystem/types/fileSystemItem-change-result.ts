export type ChangeStatus = 'success' | 'error';

export class FileChangeResult {
  fileId: string;
  status: ChangeStatus;
}

export class FolderChangeResult {
  folderId: string;
  status: ChangeStatus;
}

export type FileSystemItemChangeResult = FileChangeResult | FolderChangeResult;
