import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config();

const configService = new ConfigService();
const DATABASE_USER = configService.getOrThrow<string>('DATABASE_USER');
const DATABASE_PASSWORD = configService.getOrThrow<string>('DATABASE_PASSWORD');
const DATABASE_HOST = configService.getOrThrow<string>('DATABASE_HOST');
const DATABASE_NAME = configService.getOrThrow<string>('DATABASE_NAME');
const url = `postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}/${DATABASE_NAME}?sslmode=require`;

export default defineConfig({
  out: './src/database/migrations',
  dialect: 'postgresql',
  schema: './src/**/*.schema.ts',

  dbCredentials: {
    url,
  },

  extensionsFilters: ['postgis'],
  schemaFilter: '*',
  tablesFilter: '*',

  introspect: {
    casing: 'camel',
  },

  migrations: {
    prefix: 'timestamp',
    table: '__migrations__',
    schema: 'public',
  },

  entities: {
    roles: {
      provider: '',
      exclude: [],
      include: [],
    },
  },

  breakpoints: true,
  strict: true,
  verbose: true,
});
