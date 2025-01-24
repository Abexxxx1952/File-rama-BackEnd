import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { BaseAbstractRepository } from '@/database/abstractRepository/base.abstract.repository';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { statsSchema } from '../schema/stats.schema';
import { Stat } from '../types/stat';

@Injectable()
export class StatsRepository extends BaseAbstractRepository<
  Stat,
  typeof statsSchema
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    public readonly database: NodePgDatabase<
      Record<'Stats', typeof statsSchema>
    >,
  ) {
    super(database, statsSchema, 'Stat');
  }
}
