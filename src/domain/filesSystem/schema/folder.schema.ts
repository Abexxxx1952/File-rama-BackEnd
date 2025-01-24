import { relations } from 'drizzle-orm';
import { index, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { usersSchema } from '@/domain/users/schema/users.schema';
import { filesSchema } from './files.schema';

export const foldersSchema = pgTable(
  'folders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    folderName: text('name').notNull(),
    userId: uuid('user_id').references(() => usersSchema.id, {
      onDelete: 'cascade',
    }),
    parentFolderId: uuid('parent_folder_id').references(() => foldersSchema.id),
  },
  (table) => {
    return {
      folderIdIndex: index('folder_id_idx').on(table.id),
      uniqueFolderNameInFolder: unique('unique_folder_name_in_folder').on(
        table.folderName,
        table.parentFolderId,
      ),
    };
  },
);

export const foldersRelations = relations(foldersSchema, ({ one, many }) => ({
  user: one(usersSchema, {
    fields: [foldersSchema.userId],
    references: [usersSchema.id],
  }),

  parentFolder: one(foldersSchema, {
    fields: [foldersSchema.parentFolderId],
    references: [foldersSchema.id],
    relationName: 'parentFolder',
  }),

  childFolders: many(foldersSchema, {
    relationName: 'parentFolder',
  }),

  files: many(filesSchema),
}));
