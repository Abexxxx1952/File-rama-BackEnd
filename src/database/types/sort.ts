export type SortOrder = 'asc' | 'desc';

export type OrderBy<T> = {
  key: keyof T;
  order?: SortOrder;
};
