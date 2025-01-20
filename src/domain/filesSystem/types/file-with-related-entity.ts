import { File } from '@/domain/filesSystem/types/file';
import { Folder } from '@/domain/filesSystem/types/folder';
import { User } from '@/domain/users/types/users';

export class FileWithRelatedEntity {
  files: File;
  users?: User;
  parentFolder?: Folder;
  /*  fileStats: FileStats; */
}
