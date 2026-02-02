export type WhereCondition<T> = {
  [K in keyof T]?: T[K] | null | { notNull: boolean } | { isNull: boolean };
};
