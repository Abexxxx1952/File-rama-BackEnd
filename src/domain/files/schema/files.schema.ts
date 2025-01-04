import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { usersSchema } from 'src/domain/users/schema/users.schema';

export const fileSchema = pgTable(
  'file',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => usersSchema.id),
    fileName: text('file_name').notNull(),
    fileExtension: text('file_extension').notNull(),
    fileSize: integer('file_size').notNull(),
    uploadDate: timestamp('upload_date').defaultNow().notNull(),
    fileDescription: text('file_description'),
    isPublic: boolean('is_public').default(false).notNull(),
  },
  (table) => {
    return {
      fileIdIndex: index('file_id_idx').on(table.id),
    };
  },
);

export const fileRelations = relations(fileSchema, ({ one }) => ({
  user: one(usersSchema, {
    fields: [fileSchema.userId],
    references: [usersSchema.id],
  }),
}));
