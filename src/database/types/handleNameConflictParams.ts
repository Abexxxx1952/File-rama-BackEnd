import { PgTable, TableConfig } from 'drizzle-orm/pg-core';
import { NameConflictChoice } from '@/domain/filesSystem/types/upload-name-conflict';
import { BaseInterfaceRepository } from '../abstractRepository/base.interface.repository';

export type handleNameConflictParams<
  T extends { id: string },
  Schema extends PgTable<TableConfig>,
> = {
  parentId: string | null;
  parentField: keyof T & string;
  initialName: string;
  nameField: keyof T & string;
  repository: BaseInterfaceRepository<T, Schema>;
  userChoice?: NameConflictChoice;
};
