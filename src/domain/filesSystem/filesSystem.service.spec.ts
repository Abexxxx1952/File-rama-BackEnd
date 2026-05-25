import { NotFoundException } from '@nestjs/common';
import { FileFactory, FolderFactory } from '../../../test/factories';
import { FilesSystemService } from './filesSystem.service';

describe('FilesSystemService', () => {
  let service: FilesSystemService;
  let filesRepository: {
    parsedArrayCondition: jest.Mock;
    findAllByCondition: jest.Mock;
  };
  let foldersRepository: {
    parsedArrayCondition: jest.Mock;
    findAllByCondition: jest.Mock;
  };

  beforeEach(() => {
    filesRepository = {
      parsedArrayCondition: jest.fn(),
      findAllByCondition: jest.fn(),
    };
    foldersRepository = {
      parsedArrayCondition: jest.fn(),
      findAllByCondition: jest.fn(),
    };

    service = new FilesSystemService(
      filesRepository as any,
      foldersRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  describe('findSlice', () => {
    it('returns folders before files by default', async () => {
      const userId = 'user-id' as any;
      const folder = FolderFactory.create({ id: 'folder-1', userId });
      const file = FileFactory.create({ id: 'file-1', userId });

      foldersRepository.findAllByCondition.mockResolvedValue([folder]);
      filesRepository.findAllByCondition.mockResolvedValue([file]);

      const result = await service.findSlice(userId, null);

      expect(result).toEqual([folder, file]);
      expect(foldersRepository.findAllByCondition).toHaveBeenCalledWith(
        { userId, parentFolderId: null },
        undefined,
      );
      expect(filesRepository.findAllByCondition).toHaveBeenCalledWith(
        { userId, parentFolderId: null },
        undefined,
      );
    });

    it('returns files before folders when requested', async () => {
      const userId = 'user-id' as any;
      const folder = FolderFactory.create({ id: 'folder-1', userId });
      const file = FileFactory.create({ id: 'file-1', userId });

      foldersRepository.findAllByCondition.mockResolvedValue([folder]);
      filesRepository.findAllByCondition.mockResolvedValue([file]);

      const result = await service.findSlice(userId, null, false);

      expect(result).toEqual([file, folder]);
    });

    it('applies offset and limit to the merged slice', async () => {
      const userId = 'user-id' as any;
      const folders = [
        FolderFactory.create({ id: 'folder-1', userId }),
        FolderFactory.create({ id: 'folder-2', userId }),
      ];
      const files = [
        FileFactory.create({ id: 'file-1', userId }),
        FileFactory.create({ id: 'file-2', userId }),
      ];

      foldersRepository.findAllByCondition.mockResolvedValue(folders);
      filesRepository.findAllByCondition.mockResolvedValue(files);

      const result = await service.findSlice(
        userId,
        null,
        true,
        undefined,
        undefined,
        1,
        2,
      );

      expect(result).toEqual([folders[1], files[0]]);
    });

    it('uses zero as the default offset when only limit is provided', async () => {
      const userId = 'user-id' as any;
      const folder = FolderFactory.create({ id: 'folder-1', userId });
      const file = FileFactory.create({ id: 'file-1', userId });

      foldersRepository.findAllByCondition.mockResolvedValue([folder]);
      filesRepository.findAllByCondition.mockResolvedValue([file]);

      const result = await service.findSlice(
        userId,
        null,
        true,
        undefined,
        undefined,
        undefined,
        1,
      );

      expect(result).toEqual([folder]);
    });

    it('parses non-empty sort strings only', async () => {
      const userId = 'user-id' as any;
      const parsedFolderSort = [{ folderName: 'asc' }];
      const parsedFileSort = [{ fileName: 'desc' }];

      foldersRepository.parsedArrayCondition.mockResolvedValue(
        parsedFolderSort,
      );
      filesRepository.parsedArrayCondition.mockResolvedValue(parsedFileSort);
      foldersRepository.findAllByCondition.mockResolvedValue([]);
      filesRepository.findAllByCondition.mockResolvedValue([]);

      await service.findSlice(
        userId,
        'parent-id',
        true,
        '[{"folderName":"asc"}]',
        '[{"fileName":"desc"}]',
      );

      expect(foldersRepository.findAllByCondition).toHaveBeenCalledWith(
        { userId, parentFolderId: 'parent-id' },
        parsedFolderSort,
      );
      expect(filesRepository.findAllByCondition).toHaveBeenCalledWith(
        { userId, parentFolderId: 'parent-id' },
        parsedFileSort,
      );

      foldersRepository.parsedArrayCondition.mockClear();
      filesRepository.parsedArrayCondition.mockClear();

      await service.findSlice(userId, 'parent-id', true, ' ', '');

      expect(foldersRepository.parsedArrayCondition).not.toHaveBeenCalled();
      expect(filesRepository.parsedArrayCondition).not.toHaveBeenCalled();
    });

    it('treats missing folders or files as an empty slice part', async () => {
      const userId = 'user-id' as any;
      const file = FileFactory.create({ id: 'file-1', userId });

      foldersRepository.findAllByCondition.mockRejectedValue(
        new NotFoundException(),
      );
      filesRepository.findAllByCondition.mockResolvedValue([file]);

      const result = await service.findSlice(userId, null);

      expect(result).toEqual([file]);
    });
  });
});
