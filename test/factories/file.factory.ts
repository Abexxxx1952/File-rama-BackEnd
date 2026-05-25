import { File } from '@/domain/filesSystem/types/file';

export class FileFactory {
  private static sequence = 0;

  static create(overrides?: Partial<File>): File {
    this.sequence += 1;
    const fileName = `file-${this.sequence}`;
    const fileExtension = 'txt';

    return {
      id: `file-${this.sequence}`,
      userId: `user-${this.sequence}`,
      fileUrl: `https://example.com/files/${this.sequence}`,
      fileDownloadUrl: `https://example.com/files/${this.sequence}/download`,
      fileName,
      fileExtension,
      fileSize: 1024,
      parentFolderId: `folder-${this.sequence}`,
      fileGoogleDriveId: `google-file-${this.sequence}`,
      fileGoogleDriveParentFolderId: `google-folder-${this.sequence}`,
      fileGoogleDriveClientEmail: `drive-${this.sequence}@example.com`,
      uploadDate: new Date('2026-01-01T00:00:00.000Z'),
      publicAccessRole: null,
      fileDescription: undefined,
      fileStaticUrl: undefined,
      fileStaticCreatedAt: undefined,
      ...overrides,
    };
  }

  static createMany(count: number, overrides?: Partial<File>): File[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createPublic(overrides?: Partial<File>): File {
    return this.create({
      publicAccessRole: 'reader',
      ...overrides,
    });
  }

  static createWithStatic(overrides?: Partial<File>): File {
    return this.create({
      fileStaticUrl: 'https://example.com/static/file',
      fileStaticCreatedAt: new Date('2026-01-02T00:00:00.000Z'),
      ...overrides,
    });
  }

  static createInFolder(folderId: string, overrides?: Partial<File>): File {
    return this.create({
      parentFolderId: folderId,
      ...overrides,
    });
  }
}
