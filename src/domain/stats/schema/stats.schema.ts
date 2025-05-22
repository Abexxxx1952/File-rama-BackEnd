import { relations } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  uuid,
} from 'drizzle-orm/pg-core';
import { usersSchema } from 'src/domain/users/schema/users.schema';
import { DriveInfoResult } from '../types/driveInfoResult';

export const statsSchema = pgTable(
  'stats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => usersSchema.id, { onDelete: 'cascade' })
      .unique(),
    fileCount: integer('file_count').notNull().default(0),
    folderCount: integer('folder_count').notNull().default(0),
    totalSize: bigint('total_size', { mode: 'number' }).notNull().default(0),
    usedSize: bigint('used_size', { mode: 'number' }).notNull().default(0),
    driveInfoResult: jsonb('drive_info_result')
      .$type<DriveInfoResult[]>()
      .notNull()
      .default([]),
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
