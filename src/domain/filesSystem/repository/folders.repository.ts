import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { BaseAbstractRepository } from '@/database/abstractRepository/base.abstract.repository';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { foldersSchema } from '../schema/folder.schema';
import { Folder } from '../types/folder';

@Injectable()
export class FoldersRepository extends BaseAbstractRepository<
  Folder,
  typeof foldersSchema
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    public readonly database: NodePgDatabase<
      Record<'folders', typeof foldersSchema>
    >,
  ) {
    super(database, foldersSchema, 'Folder');
  }
}
