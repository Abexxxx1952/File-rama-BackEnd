import { Inject, Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { and, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '@/configs/providersTokens';
import { BaseAbstractRepository } from '@/database/abstractRepository/base.abstract.repository';
import { statsSchema } from '../schema/stats.schema';
import { DecrementStatsInput } from '../types/decrementStatsInput';
import { Stat } from '../types/stat';

@Injectable()
export class StatsRepository extends BaseAbstractRepository<
  Stat,
  typeof statsSchema
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    public readonly database: NodePgDatabase<
      Record<'Stats', typeof statsSchema>
    >,
  ) {
    super(database, statsSchema, 'Stat');
  }

  async findByUserId(currentUserId: UUID): Promise<Stat> {
    try {
      const result = await this.findOneByCondition({
        userId: currentUserId,
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  async incrementFileCount(userId: UUID): Promise<void> {
    await this.database
      .update(this.table)
      .set({
        fileCount: sql`${this.table.fileCount} + 1`,
      })
      .where(eq(this.table.userId, userId));
  }

  async incrementFolderCount(userId: UUID): Promise<void> {
    await this.database
      .update(this.table)
      .set({
        fileCount: sql`${this.table.folderCount} + 1`,
      })
      .where(eq(this.table.userId, userId));
  }

  async decrementFileCount(userId: UUID): Promise<void> {
    await this.database
      .update(this.table)
      .set({
        fileCount: sql`${this.table.fileCount} - 1`,
      })
      .where(eq(this.table.userId, userId));
  }

  async decrementFolderCount(userId: UUID): Promise<void> {
    await this.database
      .update(this.table)
      .set({
        fileCount: sql`${this.table.folderCount} - 1`,
      })
      .where(eq(this.table.userId, userId));
  }

  async decrementStats(
    userId: UUID,
    decrement: DecrementStatsInput,
  ): Promise<boolean> {
    const { fileCount = 0, folderCount = 0 } = decrement;

    if (fileCount === 0 && folderCount === 0) {
      return true;
    }

    const set: Record<string, any> = {};
    const conditions = [eq(this.table.userId, userId)];

    if (fileCount !== 0) {
      set.fileCount = sql`${this.table.fileCount} - ${fileCount}`;
      conditions.push(sql`${this.table.fileCount} >= ${fileCount}`);
    }

    if (folderCount !== 0) {
      set.folderCount = sql`${this.table.folderCount} - ${folderCount}`;
      conditions.push(sql`${this.table.folderCount} >= ${folderCount}`);
    }

    const result = await this.database
      .update(this.table)
      .set(set)
      .where(and(...conditions))
      .returning({
        fileCount: this.table.fileCount,
        folderCount: this.table.folderCount,
      });

    return result.length > 0;
  }
}
