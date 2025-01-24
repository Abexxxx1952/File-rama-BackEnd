import { relations } from 'drizzle-orm';
import { index, integer, pgTable, uuid } from 'drizzle-orm/pg-core';
import { usersSchema } from 'src/domain/users/schema/users.schema';

export const statsSchema = pgTable(
  'stats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => usersSchema.id, { onDelete: 'cascade' })
      .unique(),
    fileCount: integer('file_count').notNull().default(0),
    folderCount: integer('file_count').notNull().default(0),
    totalSize: integer('total_size').notNull().default(0),
    usedSize: integer('used_size').notNull().default(0),
  },
  (table) => {
    return {
      fileStatsIdIndex: index('stats_id_idx').on(table.id),
    };
  },
);

export const fileStatsRelations = relations(statsSchema, ({ one }) => ({
  user: one(usersSchema, {
    fields: [statsSchema.userId],
    references: [usersSchema.id],
  }),
}));
