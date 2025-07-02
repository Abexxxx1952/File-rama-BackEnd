import { UUID } from 'crypto';
import { InferSelectModel } from 'drizzle-orm';
import { foldersSchema } from '../schema/folder.schema';

type FolderInferSelect = InferSelectModel<typeof foldersSchema>;

export class Folder implements FolderInferSelect {
  id: string;
  folderName: string;
  userId: string;
  parentFolderId: string;
  createdDate: Date;
  isPublic: boolean;
}
