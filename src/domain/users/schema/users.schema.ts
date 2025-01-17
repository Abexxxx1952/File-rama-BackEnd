import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { filesSchema } from 'src/domain/filesSystem/schema/files.schema';
import { fileStatsSchema } from 'src/domain/stats/schema/stats.schema';
import { foldersSchema } from '@/domain/filesSystem/schema/folder.schema';
import { RegistrationSources } from '../auth/types/providers-oauth.enum';
import { UsersPermissions } from '../permissions/users-permissions';

const allowedPermissions = Object.values(UsersPermissions);

const allowedRegistrationSources: RegistrationSources[] =
  Object.values(RegistrationSources);

export const usersPermissionsEnum = pgEnum(
  'users_permissions',
  allowedPermissions as [string, ...string[]],
);
export const registrationSourcesEnum = pgEnum('users_registration_sources', [
  allowedRegistrationSources[0],
  ...allowedRegistrationSources.slice(1),
]);

export const usersSchema = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name'),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: text('password'),
    icon: text('icon'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at'),
    payloads: jsonb('payload').array().default([]),
    googleServiceAccounts: jsonb('google_service_accounts').array().default([]),
    permissions: usersPermissionsEnum('permissions')
      .array()
      .default(['CreateFile', 'DeleteFile']),
    registrationSources: registrationSourcesEnum('registration_sources')
      .array()
      .notNull(),
    isVerified: boolean('is_verified').default(false).notNull(),
    isTwoFactorEnabled: boolean('is_two_factor_enabled')
      .default(false)
      .notNull(),
  },
  (table) => {
    return {
      usersIdIndex: index('users_id_idx').on(table.id),
      usersEmailIndex: index('users_email_idx').on(table.email),
    };
  },
);

export const usersRelations = relations(usersSchema, ({ one, many }) => ({
  fileStats: one(fileStatsSchema, {
    fields: [usersSchema.id],
    references: [fileStatsSchema.userId],
  }),
  files: many(filesSchema),
  folders: many(foldersSchema),
}));
