import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { usersSchema } from 'src/domain/users/schema/users.schema';
import { foldersSchema } from './folder.schema';

export const filesSchema = pgTable(
  'files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => usersSchema.id),
    fileUrl: text('file_url').notNull(),
    fileDownloadUrl: text('file_download_url').notNull(),
    fileName: text('file_name').notNull(),
    fileExtension: text('file_extension').notNull(),
    fileSize: text('file_size').notNull(),
    parentFolderId: uuid('parent_folder_id').references(() => foldersSchema.id),
    fileGoogleDriveId: text('file_google_drive_id').notNull(),
    fileGoogleDriveParentFolderId: text(
      'file_google_drive_parent_folder_id',
    ).notNull(),
    fileGoogleDriveClientEmail: text(
      'file_google_drive_client_email',
    ).notNull(),
    uploadDate: timestamp('upload_date').defaultNow().notNull(),
    fileDescription: text('file_description'),
    isPublic: boolean('is_public').default(false).notNull(),
  },
  (table) => {
    return {
      fileIdIndex: index('file_id_idx').on(table.id),
      uniqueFileNameInFolder: unique('unique_file_name_in_folder').on(
        table.fileName,
        table.parentFolderId,
      ),
    };
  },
);

export const filesRelations = relations(filesSchema, ({ one }) => ({
  user: one(usersSchema, {
    fields: [filesSchema.userId],
    references: [usersSchema.id],
  }),
  parentFolder: one(foldersSchema, {
    fields: [filesSchema.parentFolderId],
    references: [foldersSchema.id],
  }),
}));
