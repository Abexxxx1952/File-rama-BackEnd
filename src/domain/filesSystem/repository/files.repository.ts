import { Inject, Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { BaseAbstractRepository } from '@/database/abstractRepository/base.abstract.repository';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { usersSchema } from '@/domain/users/schema/users.schema';
import { UpdateFileDto } from '../dto/update-file.dto';
import { filesSchema } from '../schema/files.schema';
import { foldersSchema } from '../schema/folder.schema';
import { File } from '../types/file';

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
      await this.findOneByCondition({ id: fileId, userId: currentUserId });
      return await this.updateById(fileId, rest);
    } catch (error) {
      throw error;
    }
  }
}
