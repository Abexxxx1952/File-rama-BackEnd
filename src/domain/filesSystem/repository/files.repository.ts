import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { BaseAbstractRepository } from '@/database/abstractRepository/base.abstract.repository';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { usersSchema } from '@/domain/users/schema/users.schema';
import { filesSchema } from '../schema/files.schema';
import { foldersSchema } from '../schema/folder.schema';
import { File } from '../types/file';

@Injectable()
export class FilesRepository extends BaseAbstractRepository<
  File,
  typeof filesSchema
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    public readonly database: NodePgDatabase<
      Record<'files', typeof filesSchema>
    >,
  ) {
    super(database, filesSchema, 'File');
    this.relatedTables = {
      user: {
        tableName: usersSchema,
        ownField: filesSchema.userId,
        relationField: usersSchema.id,
      },
      parentFolder: {
        tableName: foldersSchema,
        ownField: filesSchema.parentFolderId,
        relationField: foldersSchema.id,
      },
    };
  }
}
