import { InferSelectModel } from 'drizzle-orm';
import { tokensSchema } from '../schema/tokens.schema';

export enum TokenTypeEnum {
  VERIFICATION = 'VERIFICATION',
  TWO_FACTOR = 'TWO_FACTOR',
  PASSWORD_RESET = 'PASSWORD_RESET',
  REFRESH = 'REFRESH',
}

type InferTokensType = InferSelectModel<typeof tokensSchema>;

export type Tokens = Omit<InferTokensType, 'expiresIn'> & {
  expiresIn?: Date;
};
