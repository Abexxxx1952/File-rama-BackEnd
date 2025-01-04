import { relations } from 'drizzle-orm';
import { index, integer, pgTable, uuid } from 'drizzle-orm/pg-core';
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
      fileStatsIdIndex: index('file_stats_id_idx').on(table.id),
    };
  },
);

export const fileStatsRelations = relations(fileStatsSchema, ({ one }) => ({
  user: one(usersSchema, {
    fields: [fileStatsSchema.userId],
    references: [usersSchema.id],
  }),
}));
