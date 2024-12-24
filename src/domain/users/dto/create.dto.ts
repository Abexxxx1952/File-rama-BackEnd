import { usersSchema } from '../schema/users.schema';

export type CreateUserDto = typeof usersSchema.$inferInsert & {
  name?: string;
  icon?: string;
  payload?: [];
};
