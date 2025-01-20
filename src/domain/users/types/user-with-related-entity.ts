import { File } from '@/domain/filesSystem/types/file';
import { Folder } from '@/domain/filesSystem/types/folder';
import { User } from './users';

export class UserWithRelatedEntity {
  users: User;
  files?: File;
  folders?: Folder;
  /*  fileStats: FileStats; */
}
