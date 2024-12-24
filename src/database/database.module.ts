import { Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { loadDatabaseSchema } from './schema-loader';

export const DATABASE_CONNECTION = 'database_connection';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: async (configService: ConfigService) => {
        const pool = new Pool({
          connectionString: configService.getOrThrow('DB_CONNECTION_STRING'),
        });

        const databaseSchema = await loadDatabaseSchema();

        return drizzle(pool, {
          schema: databaseSchema,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
