import {
  pgTable,
  uuid,
  text,
  varchar,
  jsonb,
  timestamp,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { UsersPermissions } from '../permissions/users-permissions';
import { RegistrationSources } from '../auth/types/providersOAuth.enum';
import { fileSchema } from 'src/domain/files/schema/files.schema';
import { fileStatsSchema } from 'src/domain/stats/schema/stats.schema';
import { relations } from 'drizzle-orm';

const allowedPermissions = Object.values(UsersPermissions);
const allowedRegistrationSources = Object.values(RegistrationSources);

const usersPermissionsEnum = pgEnum(
  'users_permissions',
  allowedPermissions as [string, ...string[]],
);
const registrationSourcesEnum = pgEnum(
  'registration_sources',
  allowedRegistrationSources as [string, ...string[]],
);

export const usersSchema = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name'),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: text('password').notNull(),
    icon: text('icon'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at'),
    hashedRefreshToken: text('hashed_refresh_token'),
    payload: jsonb('payload').array().default([]),
    permissions: usersPermissionsEnum('permissions')
      .array()
      .default(['CreateFile', 'DeleteFile']),
    registrationSources: registrationSourcesEnum('registration_sources')
      .array()
      .default([]),
  },
  (table) => {
    return {
      idIndex: index('id_idx').on(table.id),
      emailIndex: index('email_idx').on(table.email),
    };
  },
);

export const usersRelations = relations(usersSchema, ({ one, many }) => ({
  fileStats: one(fileStatsSchema, {
    fields: [usersSchema.id],
    references: [fileStatsSchema.userId],
  }),
  files: many(fileSchema),
}));
