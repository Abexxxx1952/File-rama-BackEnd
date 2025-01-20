import { Exclude } from 'class-transformer';
import { InferSelectModel } from 'drizzle-orm';
import { MakeOptional } from '@/database/types/make-optional';
import { filesSchema } from '../schema/files.schema';

type FileInferSelect = InferSelectModel<typeof filesSchema>;

type FileWithOptionalFields = MakeOptional<FileInferSelect, 'fileDescription'>;

export class File implements FileWithOptionalFields {
  id: string;
  userId: string;
  fileUrl: string;
  fileDownloadUrl: string;
  fileName: string;
  fileExtension: string;
  fileSize: string;
  parentFolderId: string;
  fileGoogleDriveId: string;
  fileGoogleDriveParentFolderId: string;
  fileGoogleDriveClientEmail: string;
  uploadDate: Date;
  @Exclude()
  isPublic: boolean;
  fileDescription?: string;
}
