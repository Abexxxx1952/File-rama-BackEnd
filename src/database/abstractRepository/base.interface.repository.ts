import { UUID } from 'crypto';
import { PgTable, TableConfig } from 'drizzle-orm/pg-core';
import { OrderBy } from '../types/sort';

export interface BaseInterfaceRepository<
  T,
  Schema extends PgTable<TableConfig>,
> {
  /**
   * Create a new entity.
   * @param data - Data to create the entity.
   * @returns The created entity.
   */
  create(data: Partial<T>): Promise<T>;

  /**
   * Create multiple entities.
   * @param data - Data to create multiple entities.
   * @returns An array of created entities.
   */
  createMany(data: Partial<T>[]): Promise<T[]>;

  /**
   * Find an entity by its ID.
   * @param id - The ID of the entity.
   * @returns The found entity.
   */
  findById(id: string | number): Promise<T>;

  /**
   * Find an entity by a condition.
   * @param condition - The condition to filter the entity.
   * @returns The found entity.
   */
  findOneByCondition(condition: Partial<T>): Promise<T>;

  /**
   * Find all entities by a condition.
   * @param condition - The condition to filter entities.
   * @returns An array of entities.
   */
  findAllByCondition(
    condition: Partial<T>,
    orderBy?: OrderBy<T>[],
    offset?: number,
    limit?: number,
  ): Promise<T[]>;

  /**
   * Find all entities.
   * @returns An array of entities.
   */
  findAll(): Promise<T[]>;

  /**
   * Update an entity by its ID.
   * @param id - The ID of the entity.
   * @param data - The data to update.
   * @returns The updated entity.
   */
  updateById(id: string | number, data: Partial<T>): Promise<T>;

  /**
   * Update an entity by its ID.
   * @param condition - The condition to update entities.
   * @param data - The data to update.
   * @returns The updated entity.
   */
  updateByCondition(condition: Partial<T>, data: Partial<T>): Promise<T[]>;

  /**
   * Delete an entity by its ID.
   * @param id - The ID of the entity.
   * @returns The deleted entity.
   */
  deleteById(id: string | number): Promise<T>;

  /**
   * Delete entities by a condition.
   * @param condition - The condition to filter entities.
   * @returns An array of deleted entities.
   */
  deleteByCondition(condition: Partial<T>): Promise<T[]>;

  /**
   * Delete multiple entities by their IDs.
   * @param ids - Array of IDs of the entities to delete.
   * @returns Array of deleted entities.
   */
  deleteManyById(ids: (string | number | UUID)[]): Promise<T[]>;
}
