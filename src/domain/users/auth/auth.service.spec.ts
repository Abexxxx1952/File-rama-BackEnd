import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { TOKENS_REPOSITORY, USERS_REPOSITORY } from '@/configs/providersTokens';
import { UserFactory } from '../../../../test/factories';
import { UsersRepository } from '../repository/users.repository';
import { UsersService } from '../users.service';
import { AuthService } from './auth.service';
import { TokensRepository } from './repository/tokens.repository';
import { TwoFactorAuthService } from './two-factor-auth/two-factor-auth.service';
import { RegistrationSources } from './types/providers-oauth.enum';
import { TokenTypeEnum } from './types/token';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: jest.Mocked<UsersRepository>;
  let usersService: jest.Mocked<UsersService>;
  let tokensRepository: jest.Mocked<TokensRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let twoFactorAuthService: jest.Mocked<TwoFactorAuthService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_TOKEN_EXPIRATION_TIME') return 3600;

        return undefined;
      }),
      getOrThrow: jest.fn((key: string) => {
        const values = {
          PASSWORD_PEPPER: 'test-pepper',
          ACCESS_TOKEN_NAME: 'Authentication_accessToken',
          REFRESH_TOKEN_NAME: 'Authentication_refreshToken',
          REFRESH_TOKEN_PATH: '/auth/refresh',
          CLIENT_AUTH_PROVIDER_REDIRECT_URL: 'https://client.example.com/auth',
          JWT_ACCESS_TOKEN_SECRET: 'access-secret',
          JWT_ACCESS_TOKEN_EXPIRATION_TIME: 3600,
          JWT_REFRESH_TOKEN_SECRET: 'refresh-secret',
          JWT_REFRESH_TOKEN_EXPIRATION_TIME: 7200,
        };

        return values[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: USERS_REPOSITORY,
          useValue: {
            findById: jest.fn(),
            findOneByCondition: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            createUserOAuth: jest.fn(),
          },
        },
        {
          provide: TOKENS_REPOSITORY,
          useValue: {
            create: jest.fn(),
            findOneByCondition: jest.fn(),
            deleteByCondition: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: TwoFactorAuthService,
          useValue: {
            sendTwoFactorToken: jest.fn(),
            validateTwoFactorToken: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersRepository = module.get(USERS_REPOSITORY);
    usersService = module.get(UsersService);
    tokensRepository = module.get(TOKENS_REPOSITORY);
    jwtService = module.get(JwtService);
    twoFactorAuthService = module.get(TwoFactorAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUserLocal', () => {
    it('returns an attached user when email and password are valid', async () => {
      const passwordHash = await bcrypt.hash('passwordtest-pepper', 10);
      const user = UserFactory.create({
        email: 'user@example.com',
        password: passwordHash,
        registrationSources: [RegistrationSources.Local],
      });

      usersRepository.findOneByCondition.mockResolvedValue(user);

      const result = await service.validateUserLocal(user.email, 'password');

      expect(result).toEqual({
        id: user.id,
        email: user.email,
        permissions: user.permissions,
      });
    });

    it('sends a two-factor token when 2FA is enabled and code is missing', async () => {
      const passwordHash = await bcrypt.hash('passwordtest-pepper', 10);
      const user = UserFactory.create({
        email: 'user@example.com',
        password: passwordHash,
        registrationSources: [RegistrationSources.Local],
        isTwoFactorEnabled: true,
      });

      usersRepository.findOneByCondition.mockResolvedValue(user);
      twoFactorAuthService.sendTwoFactorToken.mockResolvedValue(undefined);

      const result = await service.validateUserLocal(user.email, 'password');

      expect(result).toEqual({
        message: 'Check your mail. Coded two-factor authentication required.',
      });
      expect(twoFactorAuthService.sendTwoFactorToken).toHaveBeenCalledWith(
        user.email,
      );
      expect(
        twoFactorAuthService.validateTwoFactorToken,
      ).not.toHaveBeenCalled();
    });

    it('validates a provided two-factor token before returning an attached user', async () => {
      const passwordHash = await bcrypt.hash('passwordtest-pepper', 10);
      const user = UserFactory.create({
        email: 'user@example.com',
        password: passwordHash,
        registrationSources: [RegistrationSources.Local],
        isTwoFactorEnabled: true,
      });

      usersRepository.findOneByCondition.mockResolvedValue(user);
      twoFactorAuthService.validateTwoFactorToken.mockResolvedValue(undefined);

      const result = await service.validateUserLocal(
        user.email,
        'password',
        '123456',
      );

      expect(result).toEqual({
        id: user.id,
        email: user.email,
        permissions: user.permissions,
      });
      expect(twoFactorAuthService.validateTwoFactorToken).toHaveBeenCalledWith(
        user.email,
        '123456',
      );
    });

    it('maps a missing local user to ForbiddenException', async () => {
      usersRepository.findOneByCondition.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(
        service.validateUserLocal('missing@example.com', 'password'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('refreshTokens', () => {
    it('throws ForbiddenException when refresh token hash does not match', async () => {
      const user = UserFactory.create({
        email: 'user@example.com',
      });
      const response = {
        cookie: jest.fn(),
      };

      usersRepository.findById.mockResolvedValue(user);
      tokensRepository.findOneByCondition.mockResolvedValue({
        email: user.email,
        tokenType: TokenTypeEnum.REFRESH,
        tokenValue: await bcrypt.hash('different-token', 10),
      } as any);

      await expect(
        service.refreshTokens(
          {
            id: user.id,
            email: user.email,
            permissions: user.permissions,
            refreshToken: 'provided-token',
          },
          response as any,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(jwtService.signAsync).not.toHaveBeenCalled();
      expect(tokensRepository.create).not.toHaveBeenCalled();
      expect(response.cookie).not.toHaveBeenCalled();
    });
  });
});
