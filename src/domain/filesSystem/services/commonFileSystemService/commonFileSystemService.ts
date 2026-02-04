import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  FILES_REPOSITORY,
  FOLDERS_REPOSITORY,
} from '@/configs/providersTokens';
import { FilesRepository } from '@/domain/filesSystem/repository/files.repository';
import { FoldersRepository } from '@/domain/filesSystem/repository/folders.repository';
import { File } from '@/domain/filesSystem/types/file';
import { Folder } from '@/domain/filesSystem/types/folder';
import { NameConflictChoice } from '@/domain/filesSystem/types/upload-name-conflict';

@Injectable()
export class CommonFileSystemService {
  constructor(
    @Inject(FILES_REPOSITORY)
    private readonly filesRepository: FilesRepository,
    @Inject(FOLDERS_REPOSITORY)
    private readonly foldersRepository: FoldersRepository,
  ) {}
  async handleFileNameConflict(
    parentId: string | null,
    name: string,
    extension: string,
    userChoice: NameConflictChoice = NameConflictChoice.RENAME,
  ): Promise<string> {
    let uniqueName = name;
    let innerEntity: File | null = null;

    try {
      try {
        const condition = {
          parentFolderId: parentId,
          fileName: name,
          fileExtension: extension,
        };

        innerEntity = await this.filesRepository.findOneByCondition(condition);
      } catch (error) {
        if (!(error instanceof NotFoundException)) {
          throw new InternalServerErrorException(error, { cause: error });
        }
      }

      if (!innerEntity) {
        return uniqueName;
      }

      if (userChoice === NameConflictChoice.OVERWRITE) {
        await this.filesRepository.deleteById(innerEntity.id);
        return uniqueName;
      }

      while (true) {
        uniqueName = this.incrementName(uniqueName);

        try {
          const condition = {
            parentFolderId: parentId,
            fileName: uniqueName,
            fileExtension: extension,
          };

          await this.filesRepository.findOneByCondition(condition);
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

  async handleFolderNameConflict(
    parentId: string | null,
    name: string,
    userChoice: NameConflictChoice = NameConflictChoice.RENAME,
  ): Promise<string> {
    let uniqueName = name;
    let innerEntity: Folder | null = null;

    try {
      try {
        const condition = {
          parentFolderId: parentId,
          folderName: name,
        };

        innerEntity =
          await this.foldersRepository.findOneByCondition(condition);
      } catch (error) {
        if (!(error instanceof NotFoundException)) {
          throw new InternalServerErrorException(error, { cause: error });
        }
      }

      if (!innerEntity) {
        return uniqueName;
      }

      if (userChoice === NameConflictChoice.OVERWRITE) {
        await this.foldersRepository.deleteById(innerEntity.id);
        return uniqueName;
      }

      while (true) {
        uniqueName = this.incrementName(uniqueName);

        try {
          const condition = {
            parentFolderId: parentId,
            fileName: uniqueName,
          };

          await this.foldersRepository.findOneByCondition(condition);
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

  public getExtension(fileName: string): string | null {
    const lastDot = fileName.lastIndexOf('.');

    if (lastDot <= 0 || lastDot === fileName.length - 1) {
      return null;
    }

    return fileName.slice(lastDot + 1);
  }

  public getFileNameWithoutExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex === -1 ? fileName : fileName.slice(0, lastDotIndex);
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
