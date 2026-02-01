import { Inject, Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '@/configs/providersTokens';
import { BaseAbstractRepository } from '@/database/abstractRepository/base.abstract.repository';
import { UpdateFolderDto } from '../dto/update-folder.dto';
import { foldersSchema } from '../schema/folder.schema';
import { Folder } from '../types/folder';
import { NameConflictChoice } from '../types/upload-name-conflict';

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
  ) {
    super(database, foldersSchema, 'Folder');
  }

  async updateFolder(
    currentUserId: UUID,
    updateFolderDto: UpdateFolderDto,
  ): Promise<Folder> {
    let folderName: string | null = null;
    let { folderId, ...rest } = updateFolderDto;
    const folder = await this.findById(folderId);

    if (
      updateFolderDto.parentFolderId ||
      updateFolderDto.parentFolderId === null
    ) {
      folderName = await this.handleFolderNameConflict(
        updateFolderDto.parentFolderId,
        updateFolderDto.folderName
          ? updateFolderDto.folderName
          : folder.folderName,
      );
      if (folderName !== folder.folderName) {
        rest.folderName = folderName;
      }
    }

    if (updateFolderDto.folderName && !folderName) {
      folderName = await this.handleFolderNameConflict(
        folder.parentFolderId,
        updateFolderDto.folderName,
      );
      if (folderName !== folder.folderName) {
        rest.folderName = folderName;
      }
    }

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

  async handleFolderNameConflict(
    parentId: string | null,
    name: string,
    userChoice: NameConflictChoice = NameConflictChoice.RENAME,
  ): Promise<string> {
    const result = await this.handleNameConflict<Folder>({
      parentId,
      parentField: 'parentFolderId',
      initialName: name,
      nameField: 'folderName',
      repository: this,
      userChoice: userChoice,
    });
    return result;
  }
}
