import {
  Column,
  ColumnBaseConfig,
  ColumnDataType,
  TableConfig,
} from 'drizzle-orm';
import { PgColumn, PgTable } from 'drizzle-orm/pg-core';

export type TableWithId<Schema extends PgTable<TableConfig>> = Schema & {
  id: Column<any, object, object>;
};

type RelatedTable = {
  tableName: PgTable<TableConfig>;
  ownField: PgColumn<ColumnBaseConfig<ColumnDataType, string>, object, object>;
  relationField: PgColumn<
    ColumnBaseConfig<ColumnDataType, string>,
    object,
    object
  >;
};

export type RelatedTables = {
  [relationName: string]: RelatedTable;
};
