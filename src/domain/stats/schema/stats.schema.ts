import { relations } from 'drizzle-orm';
import { pgTable, uuid, integer, index } from 'drizzle-orm/pg-core';
import { usersSchema } from 'src/domain/users/schema/users.schema';

export const fileStatsSchema = pgTable(
  'file_stats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => usersSchema.id)
      .unique(),
    fileCount: integer('file_count').notNull().default(0),
    totalSize: integer('total_size').notNull().default(0),
  },
  (table) => {
    return {
      idIndex: index('id_idx').on(table.id),
    };
  },
);

export const fileStatsRelations = relations(fileStatsSchema, ({ one }) => ({
  user: one(usersSchema, {
    fields: [fileStatsSchema.userId],
    references: [usersSchema.id],
  }),
}));
