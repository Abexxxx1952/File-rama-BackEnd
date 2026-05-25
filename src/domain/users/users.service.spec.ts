import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { USERS_REPOSITORY } from '@/configs/providersTokens';
import { UserFactory } from '../../../test/factories';
import { GoogleDriveClient } from '../filesSystem/services/googleDriveClient/googleDriveClient';
import { StatsService } from '../stats/stats.service';
import { CreateUserLocalDto } from './auth/dto/register-local.dto';
import { EmailConfirmationService } from './auth/email-confirmation/email-confirmation.service';
import { RegistrationSources } from './auth/types/providers-oauth.enum';
import { UpdateMode } from './dto/google-service-accounts';
import { UsersRepository } from './repository/users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<UsersRepository>;
  let emailConfirmationService: jest.Mocked<EmailConfirmationService>;
  let googleDriveClient: jest.Mocked<GoogleDriveClient>;
  let statsService: jest.Mocked<StatsService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockUsersRepository = {
      create: jest.fn(),
      findOneByCondition: jest.fn(),
      findById: jest.fn(),
      findByIdWithRelations: jest.fn(),
      findManyByConditions: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      parsedCondition: jest.fn(),
    };

    const mockEmailConfirmationService = {
      sendVerificationToken: jest.fn(),
      confirmEmail: jest.fn(),
    };

    const mockGoogleDriveClient = {
      getDriveClient: jest.fn(),
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
      clearAccountCache: jest.fn(),
    };

    const mockStatsService = {
      createUserStats: jest.fn(),
      updateUserStats: jest.fn(),
      getGoogleDriveInfo: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
      getOrThrow: jest.fn((key: string) => {
        if (key === 'PASSWORD_PEPPER') return 'test-pepper';

        return 'test-value';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: USERS_REPOSITORY,
          useValue: mockUsersRepository,
        },
        {
          provide: EmailConfirmationService,
          useValue: mockEmailConfirmationService,
        },
        {
          provide: GoogleDriveClient,
          useValue: mockGoogleDriveClient,
        },
        {
          provide: StatsService,
          useValue: mockStatsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(USERS_REPOSITORY);
    emailConfirmationService = module.get(EmailConfirmationService);
    googleDriveClient = module.get(GoogleDriveClient);
    statsService = module.get(StatsService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUserLocal', () => {
    it('should create a new user successfully', async () => {
      const createUserDto: CreateUserLocalDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        passwordRepeat: 'password123',
      };

      const mockUser = UserFactory.create({
        email: createUserDto.email,
        name: createUserDto.name,
        registrationSources: [RegistrationSources.Local],
      });

      usersRepository.findOneByCondition.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue(mockUser);
      statsService.createUserStats.mockResolvedValue(undefined);
      emailConfirmationService.sendVerificationToken.mockResolvedValue(
        undefined,
      );

      const result = await service.createUserLocal(createUserDto);

      expect(result).toEqual(mockUser);
      expect(usersRepository.findOneByCondition).toHaveBeenCalledWith({
        email: createUserDto.email,
      });
      expect(usersRepository.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      const createUserDto: CreateUserLocalDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        passwordRepeat: 'password123',
      };

      const existingUser = UserFactory.create({ email: createUserDto.email });

      usersRepository.findOneByCondition.mockResolvedValue(existingUser);

      await expect(service.createUserLocal(createUserDto)).rejects.toThrow(
        ConflictException,
      );

      expect(usersRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findByIdWithRelations', () => {
    it('should return a user by id', async () => {
      const mockUser = UserFactory.create();
      const relations = { relations: { stats: true } };

      usersRepository.parsedCondition.mockResolvedValue(relations);
      usersRepository.findByIdWithRelations.mockResolvedValue(mockUser);

      const result = await service.findByIdWithRelations(
        mockUser.id,
        '{"relations":{"stats":true}}',
      );

      expect(result).toEqual(mockUser);
      expect(usersRepository.findByIdWithRelations).toHaveBeenCalledWith(
        mockUser.id,
        relations.relations,
      );
    });
  });

  describe('updateUserById', () => {
    it('adds Local registration source when setting password for an OAuth user', async () => {
      const existingUser = UserFactory.create({
        registrationSources: [RegistrationSources.Google],
      });
      const updatedUser = UserFactory.create({
        ...existingUser,
        registrationSources: [
          RegistrationSources.Google,
          RegistrationSources.Local,
        ],
      });

      usersRepository.findById.mockResolvedValue(existingUser);
      usersRepository.updateById.mockResolvedValue(updatedUser);

      const result = await service.updateUserById(existingUser.id, {
        password: 'new-password',
      });

      expect(result).toEqual(updatedUser);
      expect(usersRepository.updateById).toHaveBeenCalledWith(
        existingUser.id,
        expect.objectContaining({
          password: expect.any(String),
          registrationSources: [
            RegistrationSources.Google,
            RegistrationSources.Local,
          ],
          updatedAt: expect.any(Date),
        }),
      );
      expect(statsService.updateUserStats).not.toHaveBeenCalled();
    });

    it('updates google service accounts and refreshes user stats', async () => {
      const existingUser = UserFactory.create({
        googleServiceAccounts: [],
      });
      const updatedUser = UserFactory.create({
        ...existingUser,
        googleServiceAccounts: [
          {
            clientEmail: 'drive@example.com',
            privateKey: 'private-key',
            rootFolderId: 'root-folder',
          },
        ],
      });

      usersRepository.findById.mockResolvedValue(existingUser);
      usersRepository.updateById.mockResolvedValue(updatedUser);
      statsService.updateUserStats.mockResolvedValue(undefined);

      const result = await service.updateUserById(existingUser.id, {
        googleServiceAccounts: [
          {
            clientEmail: 'drive@example.com',
            privateKey: '"private-key\\n"',
            rootFolderId: 'root-folder',
            updateMode: UpdateMode.CREATE,
          },
        ],
      });

      expect(result).toEqual(updatedUser);
      expect(usersRepository.updateById).toHaveBeenCalledWith(
        existingUser.id,
        expect.objectContaining({
          googleServiceAccounts: [
            {
              clientEmail: 'drive@example.com',
              privateKey: 'private-key\n',
              rootFolderId: 'root-folder',
            },
          ],
          updatedAt: expect.any(Date),
        }),
      );
      expect(statsService.updateUserStats).toHaveBeenCalledWith(
        updatedUser.id,
        updatedUser.googleServiceAccounts,
      );
    });

    it('throws ForbiddenException when password update target user does not exist', async () => {
      usersRepository.findById.mockRejectedValue(new NotFoundException());

      await expect(
        service.updateUserById('missing-user', { password: 'new-password' }),
      ).rejects.toThrow(ForbiddenException);

      expect(usersRepository.updateById).not.toHaveBeenCalled();
    });
  });
});
