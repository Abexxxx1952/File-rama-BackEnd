import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UUID } from 'crypto';
import { and, Column, eq, InferInsertModel, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgTable, TableConfig } from 'drizzle-orm/pg-core';
import { RelatedTables, TableWithId } from '../types/types';
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
      throw new InternalServerErrorException(error.message);
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
      throw new InternalServerErrorException(error.message);
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
      throw new InternalServerErrorException(error.message);
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
      throw new InternalServerErrorException(error.message);
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

      throw new InternalServerErrorException(error.message);
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

      throw new InternalServerErrorException(error.message);
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
    condition: Partial<T>,
    offset?: number,
    limit?: number,
  ): Promise<T[]> {
    try {
      const conditions = Object.entries(condition).map(([key, value]) => {
        const column = this.table[key as keyof Schema];
        if (column instanceof Column) {
          return value === null ? isNull(column) : eq(column, value);
        } else {
          throw new BadRequestException(`Invalid key ${key} in condition`);
        }
      });

      let query = this.database
        .select()
        .from(this.table)
        .where(and(...conditions))
        .$dynamic();

      if (offset !== undefined || offset !== null) {
        query = query.offset(offset);
      }
      if (limit !== undefined || limit !== null) {
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
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Find all entities with pagination.
   * @param offset - Number of records to skip.
   * @param limit - Maximum number of records to return.
   * @returns An array of entities.
   */
  public async findAll(offset?: number, limit?: number): Promise<T[]> {
    try {
      let query = this.database.select().from(this.table).$dynamic();

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
      throw new InternalServerErrorException(error.message);
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
      throw new InternalServerErrorException(error.message);
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
      throw new InternalServerErrorException(error.message);
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
      throw new InternalServerErrorException(error.message);
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
      throw new InternalServerErrorException(error.message);
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
}
