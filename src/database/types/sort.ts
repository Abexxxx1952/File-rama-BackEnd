export type SortOrder = 'asc' | 'desc';

export type OrderBy<T> = {
  column: keyof T;
  order?: SortOrder;
};
