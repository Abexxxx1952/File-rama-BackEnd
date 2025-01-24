import { File } from '@/domain/filesSystem/types/file';
import { Folder } from '@/domain/filesSystem/types/folder';
import { Stat } from '@/domain/stats/types/stat';
import { User } from './users';

export class UserWithRelatedEntity {
  users: User[];
  files?: File[];
  folders?: Folder[];
  stats?: Stat[];
}
