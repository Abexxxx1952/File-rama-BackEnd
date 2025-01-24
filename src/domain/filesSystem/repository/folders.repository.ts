import { Inject, Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { BaseAbstractRepository } from '@/database/abstractRepository/base.abstract.repository';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { StatsRepository } from '@/domain/stats/repository/stats.repository';
import { UsersRepository } from '@/domain/users/repository/users.repository';
import { UserWithRelatedEntity } from '@/domain/users/types/user-with-related-entity';
import { CreateFolderDto } from '../dto/create-folder.dto';
import { UpdateFolderDto } from '../dto/update-folder.dto';
import { FilesSystemService } from '../filesSystem.service';
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
    @Inject('FilesRepository')
    private readonly filesRepository: FilesRepository,
    @Inject('UsersRepository')
    private readonly usersRepository: UsersRepository,
    @Inject('StatsRepository')
    private readonly statsRepository: StatsRepository,
  ) {
    super(database, foldersSchema, 'Folder');
  }

  async updateFolder(
    currentUserId: UUID,
    updateFolderDto: UpdateFolderDto,
  ): Promise<Folder> {
    const { folderId, ...rest } = updateFolderDto;
    try {
      await this.findOneByCondition({ id: folderId, userId: currentUserId });
      return await this.updateById(folderId, rest);
    } catch (error) {
      throw error;
    }
  }

  async deleteFolder(currentUserId: UUID, folderId: UUID): Promise<Folder> {
    try {
      await this.findOneByCondition({ id: folderId, userId: currentUserId });

      const userStat = await this.statsRepository.findOneByCondition({
        userId: currentUserId,
      });

      const result = await this.deleteFolderRecursively(
        currentUserId,
        folderId,
      );
      await this.statsRepository.updateByCondition(
        { userId: currentUserId },
        { folderCount: userStat.folderCount - 1 },
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  private async deleteFolderRecursively(
    currentUserId: UUID,
    folderId: string,
  ): Promise<Folder> {
    try {
      const files = await this.filesRepository.findAllByCondition({
        userId: currentUserId,
        parentFolderId: folderId,
      });

      for (const file of files) {
        await this.filesRepository.deleteById(file.id);
      }

      const subFolders = await this.findAllByCondition({
        userId: currentUserId,
        parentFolderId: folderId,
      });

      const folder = await this.deleteById(folderId);

      for (const subFolder of subFolders) {
        await this.deleteFolderRecursively(currentUserId, subFolder.id);
      }
      return folder;
    } catch (error) {
      throw error;
    }
  }
}
