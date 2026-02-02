import { Inject, Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { isNotNull, lt, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '@/configs/providersTokens';
import { BaseAbstractRepository } from '@/database/abstractRepository/base.abstract.repository';
import { usersSchema } from '@/domain/users/schema/users.schema';
import { UpdateFileDto } from '../dto/update-file.dto';
import { filesSchema } from '../schema/files.schema';
import { foldersSchema } from '../schema/folder.schema';
import { File } from '../types/file';
import { NameConflictChoice } from '../types/upload-name-conflict';

@Injectable()
export class FilesRepository extends BaseAbstractRepository<
  File,
  typeof filesSchema
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    public readonly database: NodePgDatabase<
      Record<'files', typeof filesSchema>
    >,
  ) {
    super(database, filesSchema, 'File');
    this.relatedTables = {
      user: {
        table: usersSchema,
        ownField: usersSchema.id,
        relationField: filesSchema.userId,
      },
      parentFolder: {
        table: foldersSchema,
        ownField: foldersSchema.id,
        relationField: filesSchema.parentFolderId,
      },
    };
  }

  async updateFile(
    currentUserId: UUID,
    updateFileDto: UpdateFileDto,
  ): Promise<File> {
    const { fileId, ...rest } = updateFileDto;

    try {
      const result = await this.updateByCondition(
        { id: fileId, userId: currentUserId },
        { ...rest },
      );

      return result[0];
    } catch (error) {
      throw error;
    }
  }

  async findExpiredFiles(threshold: Date): Promise<File[]> {
    return this.database
      .select()
      .from(this.table)
      .where(lt(this.table.fileStaticCreatedAt, threshold))
      .$dynamic();
  }

  async getTotalStaticFilesSize(): Promise<number> {
    const result = await this.database
      .select({
        totalSize: sql<number>`COALESCE(SUM(${this.table.fileSize}), 0)`,
      })
      .from(this.table)
      .where(isNotNull(this.table.fileStaticUrl))
      .execute();

    return Number(result[0]?.totalSize ?? 0);
  }

  async handleFileNameConflict(
    parentId: string | null,
    name: string,
    userChoice: NameConflictChoice = NameConflictChoice.RENAME,
  ): Promise<string> {
    const result = await this.handleNameConflict<File>({
      parentId,
      parentField: 'parentFolderId',
      initialName: name,
      nameField: 'fileName',
      repository: this,
      userChoice: userChoice,
    });
    return result;
  }
}
