import { InferSelectModel } from 'drizzle-orm';
import { MakeOptional } from '@/database/types/make-optional';
import { foldersSchema } from '../schema/folder.schema';

type FolderInferSelect = InferSelectModel<typeof foldersSchema>;

type FolderWithOptionalFields = MakeOptional<
  FolderInferSelect,
  'parentFolderId'
>;

export class Folder implements FolderWithOptionalFields {
  id: string;
  folderName: string;
  userId: string;
  parentFolderId?: string;
}
