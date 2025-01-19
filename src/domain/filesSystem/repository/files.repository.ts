import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { BaseAbstractRepository } from '@/database/abstractRepository/base.abstract.repository';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { filesSchema } from '../schema/files.schema';
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
  }
}
