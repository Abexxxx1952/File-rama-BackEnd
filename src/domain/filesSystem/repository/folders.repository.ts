import { Inject, Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { FILES_REPOSITORY } from '@/configs/providersTokens';
import { DATABASE_CONNECTION } from '@/configs/providersTokens';
import { BaseAbstractRepository } from '@/database/abstractRepository/base.abstract.repository';
import { UpdateFolderDto } from '../dto/update-folder.dto';
import { foldersSchema } from '../schema/folder.schema';
import { Folder } from '../types/folder';
import { FilesRepository } from './files.repository';

@Injectable()
export class FoldersRepository extends BaseAbstractRepository<
  Folder,
  typeof foldersSchema
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    public readonly database: NodePgDatabase<
      Record<'folders', typeof foldersSchema>
    >,
    @Inject(FILES_REPOSITORY)
    private readonly filesRepository: FilesRepository,
  ) {
    super(database, foldersSchema, 'Folder');
  }

  async updateFolder(
    currentUserId: UUID,
    updateFolderDto: UpdateFolderDto,
  ): Promise<Folder> {
    const { folderId, ...rest } = updateFolderDto;
    try {
      const result = await this.updateByCondition(
        { id: folderId, userId: currentUserId },
        rest,
      );

      return result[0];
    } catch (error) {
      throw error;
    }
  }
}
