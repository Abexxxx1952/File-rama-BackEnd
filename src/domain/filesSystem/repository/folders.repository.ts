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
