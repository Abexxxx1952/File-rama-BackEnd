import { File } from './file';
import { FileSystemItemChangeResult } from './fileSystemItem-change-result';
import { Folder } from './folder';

export type DeleteFolderRecursivelyResult = {
  result: FileSystemItemChangeResult[];
  deletedFilesAll: File[];
  deletedFoldersAll: Folder[];
};
