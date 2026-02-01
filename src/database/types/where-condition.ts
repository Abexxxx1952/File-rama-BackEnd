export type WhereCondition<T> = {
  [K in keyof T]?: T[K] | null | { notNull: true };
};
