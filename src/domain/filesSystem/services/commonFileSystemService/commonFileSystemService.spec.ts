import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { NameConflictChoice } from '../../types/upload-name-conflict';
import { CommonFileSystemService } from './commonFileSystemService';

describe('CommonFileSystemService', () => {
  let service: CommonFileSystemService;
  let filesRepository: {
    findOneByCondition: jest.Mock;
    deleteById: jest.Mock;
  };
  let foldersRepository: {
    findOneByCondition: jest.Mock;
    deleteById: jest.Mock;
  };

  beforeEach(() => {
    filesRepository = {
      findOneByCondition: jest.fn(),
      deleteById: jest.fn(),
    };
    foldersRepository = {
      findOneByCondition: jest.fn(),
      deleteById: jest.fn(),
    };
    service = new CommonFileSystemService(
      filesRepository as any,
      foldersRepository as any,
    );
  });

  describe('getExtension', () => {
    it.each([
      ['photo.final.jpg', 'jpg'],
      ['README', null],
      ['.env', null],
      ['archive.', null],
    ])('returns %s extension as %s', (fileName, expected) => {
      expect(service.getExtension(fileName)).toBe(expected);
    });
  });

  describe('getFileNameWithoutExtension', () => {
    it.each([
      ['photo.final.jpg', 'photo.final'],
      ['README', 'README'],
      ['.env', ''],
    ])('returns %s name as %s', (fileName, expected) => {
      expect(service.getFileNameWithoutExtension(fileName)).toBe(expected);
    });
  });

  describe('handleFileNameConflict', () => {
    it('returns the original name when there is no conflict', async () => {
      filesRepository.findOneByCondition.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(
        service.handleFileNameConflict('parent-id', 'report', 'pdf'),
      ).resolves.toBe('report');

      expect(filesRepository.deleteById).not.toHaveBeenCalled();
    });

    it('renames the file until a free name is found', async () => {
      filesRepository.findOneByCondition
        .mockResolvedValueOnce({ id: 'existing-file' })
        .mockResolvedValueOnce({ id: 'existing-file-copy' })
        .mockRejectedValueOnce(new NotFoundException());

      await expect(
        service.handleFileNameConflict('parent-id', 'report', 'pdf'),
      ).resolves.toBe('report (2)');

      expect(filesRepository.findOneByCondition).toHaveBeenNthCalledWith(2, {
        parentFolderId: 'parent-id',
        fileName: 'report (1)',
        fileExtension: 'pdf',
      });
      expect(filesRepository.findOneByCondition).toHaveBeenNthCalledWith(3, {
        parentFolderId: 'parent-id',
        fileName: 'report (2)',
        fileExtension: 'pdf',
      });
    });

    it('deletes the existing file and keeps the name when overwrite is requested', async () => {
      filesRepository.findOneByCondition.mockResolvedValue({
        id: 'existing-file',
      });

      await expect(
        service.handleFileNameConflict(
          'parent-id',
          'report',
          'pdf',
          NameConflictChoice.OVERWRITE,
        ),
      ).resolves.toBe('report');

      expect(filesRepository.deleteById).toHaveBeenCalledWith('existing-file');
    });

    it('wraps unexpected repository errors with context', async () => {
      filesRepository.findOneByCondition.mockRejectedValue(
        new InternalServerErrorException('db is down'),
      );

      await expect(
        service.handleFileNameConflict('parent-id', 'report', 'pdf'),
      ).rejects.toThrow('Failed to handle file conflict');
    });
  });

  describe('handleFolderNameConflict', () => {
    it('renames the folder until a free name is found', async () => {
      foldersRepository.findOneByCondition
        .mockResolvedValueOnce({ id: 'existing-folder' })
        .mockRejectedValueOnce(new NotFoundException());

      await expect(
        service.handleFolderNameConflict('parent-id', 'Documents'),
      ).resolves.toBe('Documents (1)');

      expect(foldersRepository.findOneByCondition).toHaveBeenNthCalledWith(2, {
        parentFolderId: 'parent-id',
        folderName: 'Documents (1)',
      });
    });

    it('increments an existing folder copy suffix', async () => {
      foldersRepository.findOneByCondition
        .mockResolvedValueOnce({ id: 'existing-folder' })
        .mockResolvedValueOnce({ id: 'existing-folder-copy' })
        .mockRejectedValueOnce(new NotFoundException());

      await expect(
        service.handleFolderNameConflict('parent-id', 'Documents'),
      ).resolves.toBe('Documents (2)');

      expect(foldersRepository.findOneByCondition).toHaveBeenNthCalledWith(3, {
        parentFolderId: 'parent-id',
        folderName: 'Documents (2)',
      });
    });

    it('deletes the existing folder and keeps the name when overwrite is requested', async () => {
      foldersRepository.findOneByCondition.mockResolvedValue({
        id: 'existing-folder',
      });

      await expect(
        service.handleFolderNameConflict(
          'parent-id',
          'Documents',
          NameConflictChoice.OVERWRITE,
        ),
      ).resolves.toBe('Documents');

      expect(foldersRepository.deleteById).toHaveBeenCalledWith(
        'existing-folder',
      );
    });
  });
});
