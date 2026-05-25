import { Folder } from '@/domain/filesSystem/types/folder';

export class FolderFactory {
  private static sequence = 0;

  static create(overrides?: Partial<Folder>): Folder {
    this.sequence += 1;

    return {
      id: `folder-${this.sequence}`,
      folderName: `folder-${this.sequence}`,
      userId: `user-${this.sequence}`,
      parentFolderId: `parent-folder-${this.sequence}`,
      createdDate: new Date('2026-01-01T00:00:00.000Z'),
      isPublic: false,
      ...overrides,
    };
  }

  static createMany(count: number, overrides?: Partial<Folder>): Folder[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createPublic(overrides?: Partial<Folder>): Folder {
    return this.create({
      isPublic: true,
      ...overrides,
    });
  }

  static createRoot(userId: string, overrides?: Partial<Folder>): Folder {
    return this.create({
      userId,
      folderName: 'root',
      parentFolderId: userId,
      ...overrides,
    });
  }

  static createInFolder(
    parentFolderId: string,
    overrides?: Partial<Folder>,
  ): Folder {
    return this.create({
      parentFolderId,
      ...overrides,
    });
  }
}
