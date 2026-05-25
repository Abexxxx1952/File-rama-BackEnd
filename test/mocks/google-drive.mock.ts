import { drive_v3 } from 'googleapis';

/**
 * Mock Google Drive API for testing
 */
export const mockGoogleDrive: Partial<drive_v3.Drive> = {
  files: {
    create: jest.fn().mockResolvedValue({
      data: {
        id: 'mock-file-id',
        name: 'mock-file.txt',
        mimeType: 'text/plain',
      },
    }),
    get: jest.fn().mockResolvedValue({
      data: {
        id: 'mock-file-id',
        name: 'mock-file.txt',
        mimeType: 'text/plain',
      },
    }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
    update: jest.fn().mockResolvedValue({
      data: {
        id: 'mock-file-id',
        name: 'updated-file.txt',
      },
    }),
    list: jest.fn().mockResolvedValue({
      data: {
        files: [],
        nextPageToken: undefined,
      },
    }),
    copy: jest.fn().mockResolvedValue({
      data: {
        id: 'mock-copied-file-id',
        name: 'copied-file.txt',
      },
    }),
  } as any,
};

/**
 * Mock Google Drive Client
 */
export class MockGoogleDriveClient {
  getDriveClient = jest.fn().mockResolvedValue(mockGoogleDrive);
  uploadFile = jest.fn().mockResolvedValue('mock-file-id');
  deleteFile = jest.fn().mockResolvedValue(undefined);
  getFile = jest.fn().mockResolvedValue({
    id: 'mock-file-id',
    name: 'mock-file.txt',
  });
  updateFile = jest.fn().mockResolvedValue('mock-file-id');
  clearAccountCache = jest.fn().mockResolvedValue(undefined);
}

/**
 * Reset all Google Drive mocks
 */
export function resetGoogleDriveMocks(): void {
  jest.clearAllMocks();
}
