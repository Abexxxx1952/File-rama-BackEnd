import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '@/configs/providersTokens';
import { BaseAbstractRepository } from '@/database/abstractRepository/base.abstract.repository';
import { filesSchema } from '@/domain/filesSystem/schema/files.schema';
import { foldersSchema } from '@/domain/filesSystem/schema/folder.schema';
import { statsSchema } from '@/domain/stats/schema/stats.schema';
import { usersSchema } from '../schema/users.schema';
import { User } from '../types/users';

@Injectable()
export class UsersRepository extends BaseAbstractRepository<
  User,
  typeof usersSchema
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    public readonly database: NodePgDatabase<
      Record<'users', typeof usersSchema>
    >,
  ) {
    super(database, usersSchema, 'User');
    this.relatedTables = {
      folders: {
        table: foldersSchema,
        ownField: foldersSchema.userId,
        relationField: usersSchema.id,
      },
      files: {
        table: filesSchema,
        ownField: filesSchema.userId,
        relationField: usersSchema.id,
      },
      stats: {
        table: statsSchema,
        ownField: statsSchema.userId,
        relationField: usersSchema.id,
      },
    };
  }
}
