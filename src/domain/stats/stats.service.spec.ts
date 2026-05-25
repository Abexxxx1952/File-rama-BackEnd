import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { STATS_REPOSITORY, USERS_REPOSITORY } from '@/configs/providersTokens';
import { GoogleDriveClient } from '../filesSystem/services/googleDriveClient/googleDriveClient';
import { UsersRepository } from '../users/repository/users.repository';
import { StatsRepository } from './repository/stats.repository';
import { StatsService } from './stats.service';

describe('StatsService', () => {
  let service: StatsService;
  let statsRepository: jest.Mocked<StatsRepository>;
  let usersRepository: jest.Mocked<UsersRepository>;
  let googleDriveClient: jest.Mocked<GoogleDriveClient>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockStatsRepository = {
      create: jest.fn(),
      findOneByCondition: jest.fn(),
      updateByCondition: jest.fn(),
    };

    const mockUsersRepository = {
      findById: jest.fn(),
    };

    const mockGoogleDriveClient = {
      authenticate: jest.fn(),
    };

    const mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'TOTAL_ACCOUNT_SIZE') return 15000000000;

        return 'test-value';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        {
          provide: STATS_REPOSITORY,
          useValue: mockStatsRepository,
        },
        {
          provide: USERS_REPOSITORY,
          useValue: mockUsersRepository,
        },
        {
          provide: GoogleDriveClient,
          useValue: mockGoogleDriveClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);
    statsRepository = module.get(STATS_REPOSITORY);
    usersRepository = module.get(USERS_REPOSITORY);
    googleDriveClient = module.get(GoogleDriveClient);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUserStats', () => {
    it('should create stats for a user', async () => {
      const userId = 'user-id' as any;
      const googleServiceAccounts = [
        {
          clientEmail: 'test@example.com',
          privateKey: 'key',
          rootFolderId: 'folder-id',
        },
      ];

      const mockStats = {
        userId,
        fileCount: 0,
        folderCount: 0,
        totalSize: 15000000000,
        usedSize: 0,
      };

      statsRepository.create.mockResolvedValue(mockStats as any);

      const result = await service.createUserStats(
        userId,
        googleServiceAccounts,
      );

      expect(result).toEqual(mockStats);
      expect(statsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          fileCount: 0,
          folderCount: 0,
          totalSize: 15000000000,
          usedSize: 0,
        }),
      );
    });
  });

  describe('updateUserStats', () => {
    it('should update stats successfully', async () => {
      const userId = 'user-id' as any;
      const googleServiceAccounts = [
        {
          clientEmail: 'test@example.com',
          privateKey: 'key',
          rootFolderId: 'folder-id',
        },
      ];

      const updatedStats = {
        userId,
        fileCount: 10,
        folderCount: 5,
        totalSize: 15000000000,
        usedSize: 1024000,
      };

      statsRepository.updateByCondition.mockResolvedValue([
        updatedStats,
      ] as any);

      const result = await service.updateUserStats(
        userId,
        googleServiceAccounts,
      );

      expect(result).toEqual(updatedStats);
      expect(statsRepository.updateByCondition).toHaveBeenCalledWith(
        { userId },
        { totalSize: 15000000000 },
      );
    });
  });
});
