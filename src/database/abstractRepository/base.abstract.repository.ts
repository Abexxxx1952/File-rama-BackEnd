import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UUID } from 'crypto';
import {
  and,
  asc,
  Column,
  desc,
  eq,
  inArray,
  InferInsertModel,
  isNotNull,
  isNull,
} from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgTable, TableConfig } from 'drizzle-orm/pg-core';
import { NameConflictChoice } from '@/domain/filesSystem/types/upload-name-conflict';
import { handleNameConflictParams } from '../types/handleNameConflictParams';
import { RelatedTables, TableWithId } from '../types/orm-types';
import { OrderBy } from '../types/sort';
import { WhereCondition } from '../types/where-condition';
import { BaseInterfaceRepository } from './base.interface.repository';

export abstract class BaseAbstractRepository<
  T,
  Schema extends TableWithId<PgTable<TableConfig>>,
> implements BaseInterfaceRepository<T, Schema>
{
  protected relatedTables: RelatedTables;
  protected constructor(
    public readonly database: NodePgDatabase<{ [key: string]: Schema }>,
    public readonly table: Schema,
    public readonly entityName: string,
  ) {
    this.relatedTables = {};
  }
  /**
   * Create a new entity.
   * @param data - Data to create the entity.
   * @returns The created entity.
   */
  public async create(data: Partial<T>): Promise<T> {
    try {
      const result = await this.database
        .insert(this.table)
        .values(data as InferInsertModel<Schema>)
        .returning();

      if (!Array.isArray(result) || result.length === 0) {
        throw new BadRequestException(`Failed to create ${this.entityName}`);
      }

      return result[0] as T;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error creating ${this.entityName}: ${error.message}`,
        { cause: error },
      );
    }
  }

  /**
   * Create multiple entities.
   * @param data - Data to create multiple entities.
   * @returns An array of created entities.
   */
  public async createMany(data: Partial<T>[]): Promise<T[]> {
    try {
      const result = await this.database
        .insert(this.table)
        .values(data as InferInsertModel<Schema>[])
        .returning();

      if (!Array.isArray(result) || result.length === 0) {
        throw new BadRequestException(`Failed to create ${this.entityName}s`);
      }

      return result as T[];
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error creating ${this.entityName}s: ${error.message}`,
        { cause: error },
      );
    }
  }

  /**
   * Find an entity by its ID.
   * @param id - The ID of the entity.
   * @returns The found entity.
   */
  public async findById(id: string | number | UUID): Promise<T> {
    try {
      const result = await this.database
        .select()
        .from(this.table)
        .where(eq(this.table.id, id))
        .limit(1);
      if (!result || result.length === 0) {
        throw new NotFoundException(
          `${this.entityName} with ID ${id} not found`,
        );
      }
      return result[0] as T;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error finding ${this.entityName} by ID: ${error.message}`,
        { cause: error },
      );
    }
  }

  /**
   * Find an entity by its ID with related entities.
   * @param id - The ID of the entity.
   * @param include - The related entities to include.
   * @returns The found entity.
   */
  public async findByIdWithRelations<K>(
    id: string | number | UUID,
    include: string[],
  ): Promise<K> {
    try {
      const joins = include.map((relation) => {
        const relatedTable = this.relatedTables[relation];
        if (!relatedTable) {
          throw new BadRequestException(`Invalid relation: ${relation}`);
        }
        return relatedTable;
      });

      let query = this.database
        .select()
        .from(this.table)
        .where(eq(this.table.id, id));

      joins.forEach((join) => {
        query.leftJoin(join.table, eq(join.relationField, join.ownField));
      });

      const result = await query;

      if (!result || result.length === 0) {
        throw new NotFoundException(
          `${this.entityName} with ID ${id} not found`,
        );
      }

      const aggregatedResult = this.aggregateResults(result);

      return aggregatedResult as K;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error finding ${this.entityName} by ID with relations: ${error.message}`,
        { cause: error },
      );
    }
  }

  /**
   * Find one entity by condition.
   * @param condition - The condition to filter the entity.
   * @returns The found entity.
   */
  public async findOneByCondition(condition: Partial<T>): Promise<T> {
    try {
      const conditions = Object.entries(condition).map(([key, value]) => {
        const column = this.table[key as keyof Schema];
        if (column instanceof Column) {
          return value === null ? isNull(column) : eq(column, value);
        } else {
          throw new BadRequestException(`Invalid key ${key} in condition`);
        }
      });

      const result = await this.database
        .select()
        .from(this.table)
        .where(and(...conditions))
        .limit(1);

      if (!result || result.length === 0) {
        throw new NotFoundException(`${this.entityName} not found`);
      }

      return result[0] as T;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Error finding ${this.entityName} by condition: ${error.message}`,
        { cause: error },
      );
    }
  }

  /**
   * Find one entity by condition with related entities.
   * @param condition - The condition to filter the entity.
   * @param include - The related entities to include.
   * @returns The found entity.
   */
  public async findOneByConditionWithRelations<K>(
    condition: Partial<T>,
    include: string[],
  ): Promise<K> {
    try {
      const conditions = Object.entries(condition).map(([key, value]) => {
        const column = this.table[key as keyof Schema];
        if (column instanceof Column) {
          return value === null ? isNull(column) : eq(column, value);
        } else {
          throw new BadRequestException(`Invalid key ${key} in condition`);
        }
      });

      const joins = include.map((relation) => {
        const relatedTable = this.relatedTables[relation];
        if (!relatedTable) {
          throw new BadRequestException(`Invalid relation: ${relation}`);
        }
        return relatedTable;
      });

      let query = this.database
        .select()
        .from(this.table)
        .where(and(...conditions));
      joins.forEach((join) => {
        query.leftJoin(join.table, eq(join.ownField, join.relationField));
      });

      const result = await query;
      if (!result || result.length === 0) {
        throw new NotFoundException(`${this.entityName} not found`);
      }

      const aggregatedResult = this.aggregateResults(result);

      return aggregatedResult as K;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Error finding ${this.entityName} with relations by condition: ${error.message}`,
        { cause: error },
      );
    }
  }

  /**
   * Find all entities by a condition.
   * @param condition - The condition to filter entities.
   * @param offset - The number of entities to skip.
   * @param limit - The maximum number of entities to return.
   * @returns An array of entities.
   */
  public async findAllByCondition(
    condition: WhereCondition<T>,
    orderBy?: OrderBy<T>[],
    offset?: number,
    limit?: number,
  ): Promise<T[]> {
    try {
      const conditions = Object.entries(condition).map(([key, value]) => {
        const column = this.table[key as keyof Schema];

        if (!(column instanceof Column)) {
          throw new BadRequestException(`Invalid key ${key} in condition`);
        }

        if (value === null) {
          return isNull(column);
        }

        if (
          typeof value === 'object' &&
          value !== null &&
          'notNull' in value &&
          value.notNull === true
        ) {
          return isNotNull(column);
        }

        return eq(column, value);
      });

      let query = this.database
        .select()
        .from(this.table)
        .where(and(...conditions))
        .$dynamic();

      if (orderBy?.length) {
        const orderExpressions = orderBy.map(({ column, order = 'asc' }) => {
          const col = this.table[column as keyof Schema];

          if (!(col instanceof Column)) {
            throw new BadRequestException(
              `Invalid orderBy column ${String(column)}`,
            );
          }

          return order === 'asc' ? asc(col) : desc(col);
        });

        query = query.orderBy(...orderExpressions);
      }

      if (offset !== undefined && offset !== null) {
        query = query.offset(offset);
      }
      if (limit !== undefined && limit !== null) {
        query = query.limit(limit);
      }

      const result = await query;

      if (!result || result.length === 0) {
        throw new NotFoundException(`${this.entityName}s not found`);
      }
      return result as T[];
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error finding ${this.entityName}s by condition: ${error.message}`,
        { cause: error },
      );
    }
  }

  /**
   * Find all entities with pagination.
   * @param offset - Number of records to skip.
   * @param limit - Maximum number of records to return.
   * @returns An array of entities.
   */
  public async findAll(
    orderBy?: OrderBy<T>[],
    offset?: number,
    limit?: number,
  ): Promise<T[]> {
    try {
      let query = this.database.select().from(this.table).$dynamic();

      if (orderBy?.length) {
        const orderExpressions = orderBy.map(({ column, order = 'asc' }) => {
          const col = this.table[column as keyof Schema];

          if (!(col instanceof Column)) {
            throw new BadRequestException(
              `Invalid orderBy column ${String(column)}`,
            );
          }

          return order === 'asc' ? asc(col) : desc(col);
        });

        query = query.orderBy(...orderExpressions);
      }

      if (offset !== undefined) {
        query = query.offset(offset);
      }
      if (limit !== undefined) {
        query = query.limit(limit);
      }

      const result = await query;
      if (!result || result.length === 0) {
        throw new NotFoundException(`${this.entityName}s not found`);
      }

      return result as T[];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error finding ${this.entityName}s: ${error.message}`,
        { cause: error },
      );
    }
  }

  /**
   * Update an entity by its ID.
   * @param id - The ID of the entity.
   * @param data - The data to update.
   * @returns The updated entity.
   */
  public async updateById(
    id: string | number | UUID,
    data: Partial<T>,
  ): Promise<T> {
    try {
      const result = await this.database
        .update(this.table)
        .set(data)
        .where(eq(this.table.id, id))
        .returning();

      if (!Array.isArray(result) || result.length === 0) {
        throw new NotFoundException(`${this.entityName} not found`);
      }

      return result[0] as T;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error updating ${this.entityName} by ID: ${error.message}`,
        { cause: error },
      );
    }
  }

  /**
   * Update an entity by condition.
   * @param condition - The condition to update entities.
   * @param data - The data to update.
   * @returns The updated entity.
   */
  public async updateByCondition(
    condition: Partial<T>,
    data: Partial<T>,
  ): Promise<T[]> {
    try {
      const conditions = Object.entries(condition).map(([key, value]) => {
        const column = this.table[key as keyof Schema];
        if (column instanceof Column) {
          return eq(column, value);
        } else {
          throw new BadRequestException(`Invalid key ${key} in condition`);
        }
      });

      const result = await this.database
        .update(this.table)
        .set(data)
        .where(and(...conditions))
        .returning();

      if (!Array.isArray(result) || result.length === 0) {
        throw new NotFoundException(`${this.entityName} not found`);
      }

      return result as T[];
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error updating ${this.entityName}s by condition: ${error.message}`,
        { cause: error },
      );
    }
  }

  /**
   * Update multiple entities by their IDs.
   * @param updates - Array of objects with `id` and `data` to update.
   * @returns Array of updated entities.
   */
  public async updateManyById(
    updates: { id: string | number | UUID; data: Partial<T> }[],
  ): Promise<T[]> {
    if (updates.length === 0) {
      throw new BadRequestException('No updates provided');
    }

    const results: T[] = [];

    try {
      await this.database.transaction(async (tx) => {
        for (const { id, data } of updates) {
          const result = await tx
            .update(this.table)
            .set(data)
            .where(eq(this.table.id, id))
            .returning();

          if (!Array.isArray(result) || result.length === 0) {
            throw new NotFoundException(
              `${this.entityName} not found with ID: ${id}`,
            );
          }

          results.push(result[0] as T);
        }
      });

      return results;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Error updating multiple ${this.entityName}s: ${error.message}`,
        { cause: error },
      );
    }
  }

  /**
   * Delete an entity by its ID.
   * @param id - The ID of the entity.
   * @returns The deleted entity.
   */
  public async deleteById(id: string | number | UUID): Promise<T> {
    try {
      const result = await this.database
        .delete(this.table)
        .where(eq(this.table.id, id))
        .returning();

      if (!Array.isArray(result) || result.length === 0) {
        throw new NotFoundException(`${this.entityName} not found`);
      }

      return result[0] as T;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error deleting ${this.entityName} by ID: ${error.message}`,
        { cause: error },
      );
    }
  }

  /**
   * Delete entities by a condition.
   * @param condition - The condition to filter entities.
   * @returns An array of deleted entities.
   */
  public async deleteByCondition(condition: Partial<T>): Promise<T[]> {
    try {
      const conditions = Object.entries(condition).map(([key, value]) => {
        const column = this.table[key as keyof Schema];
        if (column instanceof Column) {
          return eq(column, value);
        } else {
          throw new BadRequestException(`Invalid key ${key} in condition`);
        }
      });

      const result = await this.database
        .delete(this.table)
        .where(and(...conditions))
        .returning();

      if (!Array.isArray(result) || result.length === 0) {
        throw new NotFoundException(`${this.entityName} not found`);
      }

      return result as T[];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error deleting ${this.entityName} by condition: ${error.message}`,
        { cause: error },
      );
    }
  }

  /**
   * Delete an entities by its ID.
   * @param id - The array of ID of the entity.
   * @returns An array of deleted entities.
   */
  public async deleteManyById(ids: (number | string | UUID)[]): Promise<T[]> {
    try {
      if (!('id' in this.table)) {
        throw new Error('The table does not contain the column "id"');
      }

      const idColumn = this.table.id;
      console.log('idColumn', idColumn);

      const result = await this.database
        .delete(this.table)
        .where(inArray(idColumn, ids))
        .returning();
      console.log('result', result);

      if (!Array.isArray(result) || result.length === 0) {
        throw new NotFoundException(`${this.entityName}s not found`);
      }

      return result as T[];
    } catch (error) {
      console.log('error', error);

      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error deleting ${this.entityName}s by ID: ${error.message}`,
        { cause: error },
      );
    }
  }

  /**
   * Parse entities by a condition.
   * @param condition - The condition to filter entities.
   * @param DTO - The DTO to validate entities.
   * @returns Parsed entities.
   */
  public async parsedCondition<T extends object>(
    condition: { condition: string },
    DTO: new () => T,
  ): Promise<T> {
    let parsedCondition: T;
    try {
      parsedCondition = JSON.parse(condition.condition);
    } catch (error) {
      throw new BadRequestException('Invalid JSON format');
    }
    try {
      parsedCondition = plainToInstance(DTO, parsedCondition);
      const errors = await validate(parsedCondition);
      if (errors.length > 0) {
        throw new BadRequestException(
          'Validation failed: ' + errors.toString(),
        );
      }
    } catch (error) {
      throw error;
    }
    return parsedCondition;
  }

  /**
   * Parse entities by a condition.
   * @param condition - The condition to sort entities.
   * @param DTO - The DTO to validate entities.
   * @returns Parsed entities.
   */
  public async parsedArrayCondition<T extends object>(
    orderBy: { orderBy: string },
    DTO: new () => T,
  ): Promise<T[]> {
    let parsed: any;
    try {
      parsed = JSON.parse(orderBy.orderBy);
    } catch {
      throw new BadRequestException('Invalid JSON format');
    }

    const instances = plainToInstance(DTO, parsed as T[]);
    const errors = await Promise.all(instances.map((i) => validate(i)));

    const allErrors = errors.flat();
    if (allErrors.length > 0) {
      throw new BadRequestException(
        'Validation failed: ' + allErrors.toString(),
      );
    }

    return instances;
  }

  /**
   * Validate entities by a DTO.
   * @param object - The object to validate.
   * @param DTO - The DTO to validate object.
   * @returns Validated object.
   */
  public async validateObject<T extends object>(
    object: any,
    DTO: new () => T,
  ): Promise<T> {
    let validatedObject: T;

    try {
      validatedObject = plainToInstance(DTO, object);

      const errors = await validate(validatedObject);

      if (errors.length > 0) {
        const errorMessages = errors
          .map((error) => Object.values(error.constraints).join(', '))
          .join('; ');
        throw new BadRequestException(`Validation failed: ${errorMessages}`);
      }
    } catch (error) {
      throw error;
    }

    return validatedObject;
  }

  public async handleNameConflict<T extends { id: string }>(
    params: handleNameConflictParams<T, Schema>,
  ): Promise<string> {
    const {
      parentId,
      parentField,
      initialName,
      nameField,
      repository,
      userChoice = NameConflictChoice.RENAME,
    } = params;
    let uniqueName = initialName;
    let innerEntity: T | null = null;

    try {
      try {
        const condition = {
          [parentField]: parentId,
          [nameField]: uniqueName,
        } as Partial<T>;

        innerEntity = await repository.findOneByCondition(condition);
      } catch (error) {
        if (!(error instanceof NotFoundException)) {
          throw new InternalServerErrorException(error, { cause: error });
        }
      }

      if (!innerEntity) {
        return uniqueName;
      }

      if (userChoice === NameConflictChoice.OVERWRITE) {
        await repository.deleteById(innerEntity.id);
        return uniqueName;
      }

      while (true) {
        uniqueName = this.incrementName(uniqueName);

        try {
          const condition = {
            [parentField]: parentId,
            [nameField]: uniqueName,
          } as Partial<T>;

          await repository.findOneByCondition(condition);
        } catch (error) {
          if (error instanceof NotFoundException) {
            return uniqueName;
          }
          throw new InternalServerErrorException(error, { cause: error });
        }
      }
    } catch (error) {
      throw new Error(`Failed to handle file conflict: ${error.message}`, {
        cause: error,
      });
    }
  }

  private aggregateResults(results: any[]): Record<string, any[]> {
    const aggregated: Record<string, any[]> = {};
    const uniqueIds: Record<string, Set<string>> = {};

    results.forEach((result) => {
      Object.keys(result).forEach((key) => {
        const entity = result[key];

        if (entity === null || entity === undefined) return;

        if (!aggregated[key]) {
          aggregated[key] = [];
          uniqueIds[key] = new Set<string>();
        }

        if (!uniqueIds[key].has(entity.id)) {
          aggregated[key].push(entity);
          uniqueIds[key].add(entity.id);
        }
      });
    });

    return aggregated;
  }

  private incrementName(name: string): string {
    const lastDot = name.lastIndexOf('.');

    const hasExtension = lastDot > 0 && lastDot < name.length - 1;

    const baseWithCounter = hasExtension ? name.slice(0, lastDot) : name;

    const ext = hasExtension ? name.slice(lastDot) : '';

    const match = baseWithCounter.match(/\s\((\d+)\)$/);

    if (match) {
      const counter = Number(match[1]) + 1;
      const base = baseWithCounter.replace(/\s\(\d+\)$/, '');
      return `${base} (${counter})${ext}`;
    }

    return `${baseWithCounter} (1)${ext}`;
  }
}
