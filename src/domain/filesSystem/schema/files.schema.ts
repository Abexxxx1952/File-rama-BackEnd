import { relations } from 'drizzle-orm';
import {
  bigint,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { usersSchema } from 'src/domain/users/schema/users.schema';
import { foldersSchema } from './folder.schema';

const publicAccessRoleEnum = pgEnum('public_access_role', ['reader', 'writer']);

export const filesSchema = pgTable(
  'files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => usersSchema.id, {
      onDelete: 'cascade',
    }),
    fileUrl: text('file_url').notNull(),
    fileDownloadUrl: text('file_download_url').notNull(),
    fileName: text('file_name').notNull(),
    fileExtension: text('file_extension').notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    fileStaticUrl: text('file_static_url'),
    fileStaticCreatedAt: timestamp('file_static_created_at'),
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
    publicAccessRole: publicAccessRoleEnum('public_access_role'),
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
