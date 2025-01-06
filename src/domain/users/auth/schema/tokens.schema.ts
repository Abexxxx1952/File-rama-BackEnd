import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { TokenTypeEnum } from '../types/tokens';

const TokenType: TokenTypeEnum[] = Object.values(TokenTypeEnum);

export const tokensTypeEnum = pgEnum('tokens_type', [
  TokenType[0],
  ...TokenType.slice(1),
]);

export const tokensSchema = pgTable(
  'tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    tokenValue: text('token_value').notNull().unique(),
    tokenType: tokensTypeEnum('token_type').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    expiresIn: timestamp('expire_in'),
  },
  (table) => {
    return {
      emailIndex: index('email_idx').on(table.email),
    };
  },
);
