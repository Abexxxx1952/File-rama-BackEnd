import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '@/configs/providersTokens';
import { BaseAbstractRepository } from '@/database/abstractRepository/base.abstract.repository';
import { tokensSchema } from '../schema/tokens.schema';
import { Token } from '../types/token';

@Injectable()
export class TokensRepository extends BaseAbstractRepository<
  Token,
  typeof tokensSchema
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    public readonly database: NodePgDatabase<
      Record<'tokens', typeof tokensSchema>
    >,
  ) {
    super(database, tokensSchema, 'Token');
  }
}
