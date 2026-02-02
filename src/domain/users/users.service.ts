import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UUID } from 'crypto';
import { USERS_REPOSITORY } from '@/configs/providersTokens';
import { User } from '@/domain/users/types/users';
import { StatsService } from '../stats/stats.service';
import { CreateUserLocalDto } from './auth/dto/register-local.dto';
import { EmailConfirmationService } from './auth/email-confirmation/email-confirmation.service';
import { ParseUserOAuth } from './auth/types/parse-user-oauth';
import { RegistrationSources } from './auth/types/providers-oauth.enum';
import { FindUsersByConditionsDto } from './dto/find-by-conditions.dto';
import {
  GoogleServiceAccountsDto,
  UpdateMode,
} from './dto/google-service-accounts';
import { relationsUserDto } from './dto/relations.dto';
import { UpdateUserDto } from './dto/update.dto';
import { UsersSortedDto } from './dto/user-sorted.dto';
import { UsersRepository } from './repository/users.repository';
import { GoogleServiceAccounts } from './types/google-service-accounts';
import { UserWithRelatedEntity } from './types/user-with-related-entity';

@Injectable()
export class UsersService {
  private readonly uniqueProperty: string = 'email';
  private readonly pepper: string;
  private readonly saltRounds = 10;
  constructor(
    private readonly configService: ConfigService,
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    private readonly emailConfirmationService: EmailConfirmationService,
    private readonly statsService: StatsService,
  ) {
    this.pepper = this.configService.getOrThrow<string>('PASSWORD_PEPPER');
  }

  async createUserLocal(createUserLocalDto: CreateUserLocalDto): Promise<User> {
    const errorResponse = {
      errors: {},
    };

    try {
      const user = await this.usersRepository.findOneByCondition({
        [this.uniqueProperty]: createUserLocalDto.email,
      });

      if (user) {
        errorResponse.errors[this.uniqueProperty] = 'Has already been taken';
        errorResponse.errors['message'] = 'Conflict error';
        errorResponse.errors['statusCode'] = '409';
        throw new ConflictException(errorResponse.errors);
      }
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (!(error instanceof NotFoundException)) {
        throw new InternalServerErrorException(error);
      }
    }

    try {
      const hashedPassword: string = await this.hashPassword(
        createUserLocalDto.password,
      );
      const { passwordRepeat, ...userWithoutPasswordRepeat } =
        createUserLocalDto;

      const entity = {
        ...userWithoutPasswordRepeat,
        password: hashedPassword,
        registrationSources: [RegistrationSources.Local],
      };

      const user = await this.usersRepository.create(entity);

      await this.emailConfirmationService.sendVerificationToken(entity.email);

      await this.statsService.createUserStats(
        user.id,
        user.googleServiceAccounts,
      );

      return user;
    } catch (error) {
      throw error;
    }
  }
  async createUserOAuth(createUserOAuthDto: ParseUserOAuth): Promise<User> {
    try {
      const entity = {
        ...createUserOAuthDto,
        registrationSources: [RegistrationSources.Local],
      };

      const user = await this.usersRepository.create(entity);

      await this.statsService.createUserStats(
        user.id,
        user.googleServiceAccounts,
      );

      return user;
    } catch (error) {
      throw error;
    }
  }

  async findAll(
    orderBy?: { orderBy: string },
    offset?: number,
    limit?: number,
  ): Promise<User[]> {
    try {
      const parsedOrderBy = orderBy
        ? await this.usersRepository.parsedArrayCondition<UsersSortedDto>(
            orderBy,
            UsersSortedDto,
          )
        : undefined;

      return await this.usersRepository.findAll(parsedOrderBy, offset, limit);
    } catch (error) {
      throw error;
    }
  }
  async findManyByConditions(
    condition: { condition: string },
    orderBy?: { orderBy: string },
    offset?: number,
    limit?: number,
  ): Promise<User[]> {
    try {
      const parsedCondition =
        await this.usersRepository.parsedCondition<FindUsersByConditionsDto>(
          condition,
          FindUsersByConditionsDto,
        );

      const parsedOrderBy = orderBy
        ? await this.usersRepository.parsedArrayCondition<UsersSortedDto>(
            orderBy,
            UsersSortedDto,
          )
        : undefined;

      return await this.usersRepository.findAllByCondition(
        parsedCondition,
        parsedOrderBy,
        offset,
        limit,
      );
    } catch (error) {
      throw error;
    }
  }

  async findOneByCondition(condition: { condition: string }): Promise<User> {
    try {
      const parsedCondition =
        await this.usersRepository.parsedCondition<FindUsersByConditionsDto>(
          condition,
          FindUsersByConditionsDto,
        );

      return await this.usersRepository.findOneByCondition(parsedCondition);
    } catch (error) {
      throw error;
    }
  }

  async findByIdWithRelations(
    currentUserId: UUID,
    condition: { condition: string },
  ): Promise<UserWithRelatedEntity> {
    try {
      const parsedRelations =
        await this.usersRepository.parsedCondition<relationsUserDto>(
          condition,
          relationsUserDto,
        );

      return await this.usersRepository.findByIdWithRelations<UserWithRelatedEntity>(
        currentUserId,
        parsedRelations.relations,
      );
    } catch (error) {
      throw error;
    }
  }

  async status(email: string): Promise<User> {
    try {
      const user = await this.usersRepository.findOneByCondition({ email });
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ForbiddenException('Access Denied');
      }
      throw error;
    }
  }

  async updateUserById(id: string, data: UpdateUserDto): Promise<User> {
    let dataUpdate: Partial<User> = {};
    let existUser: User;

    if (data.password) {
      try {
        existUser = await this.usersRepository.findById(id);
        dataUpdate.password = await this.hashPassword(data.password);
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw new ForbiddenException('Access Denied');
        }
        throw error;
      }

      if (!existUser.registrationSources.includes(RegistrationSources.Local)) {
        dataUpdate.registrationSources = [
          ...existUser.registrationSources,
          RegistrationSources.Local,
        ];
      }
    }
    if (data.googleServiceAccounts) {
      if (!existUser) {
        try {
          existUser = await this.usersRepository.findById(id);
        } catch (error) {
          if (error instanceof NotFoundException) {
            throw new ForbiddenException('Access Denied');
          }
          throw error;
        }
      }
      dataUpdate.googleServiceAccounts = this.updateUserGoogleServiceAccounts(
        data.googleServiceAccounts,
        existUser.googleServiceAccounts,
      );
    }

    dataUpdate = {
      ...(data as Partial<User>),
      ...dataUpdate,
      updatedAt: new Date(),
    };

    try {
      const user = await this.usersRepository.updateById(id, dataUpdate);

      if (dataUpdate.googleServiceAccounts) {
        await this.statsService.updateUserStats(
          user.id,
          user.googleServiceAccounts,
        );
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password + this.pepper, this.saltRounds);
  }

  private updateUserGoogleServiceAccounts(
    googleServiceAccountsRequest: GoogleServiceAccountsDto[],
    googleServiceAccountsExisting: GoogleServiceAccounts[],
  ): GoogleServiceAccounts[] {
    let googleServiceAccountsRequestCopy: GoogleServiceAccounts[] = [];
    const googleServiceAccountsExistingCopy = [
      ...googleServiceAccountsExisting,
    ];
    let deletionOffsetIndex = 0;
    let updateAndDeleteCount = 0;
    googleServiceAccountsRequest.forEach((reqAccount, reqAccountIndex) => {
      if (
        googleServiceAccountsExisting.length === 0 &&
        reqAccount.updateMode === UpdateMode.CREATE
      ) {
        googleServiceAccountsRequestCopy.push({
          clientEmail: reqAccount.clientEmail,
          privateKey: reqAccount.privateKey,
          rootFolderId: reqAccount.rootFolderId
            ? reqAccount.rootFolderId
            : undefined,
        });
        return;
      }
      if (
        googleServiceAccountsExisting.length === 0 &&
        (reqAccount.updateMode === UpdateMode.UPDATE || UpdateMode.DELETE)
      ) {
        throw new BadRequestException('Account does not exists');
      }

      if (reqAccount.updateMode === UpdateMode.CREATE) {
        googleServiceAccountsRequestCopy[reqAccountIndex] = {
          clientEmail: reqAccount.clientEmail,
          privateKey: reqAccount.privateKey,
          rootFolderId: reqAccount.rootFolderId
            ? reqAccount.rootFolderId
            : undefined,
        };
      }

      if (
        reqAccount.updateMode === UpdateMode.UPDATE ||
        reqAccount.updateMode === UpdateMode.DELETE
      ) {
        updateAndDeleteCount++;
      }

      googleServiceAccountsExisting.forEach(
        (existAccount, existAccountIndex) => {
          if (existAccount.clientEmail === reqAccount.clientEmail) {
            if (reqAccount.updateMode === UpdateMode.CREATE) {
              throw new BadRequestException('Account already exists');
            }
            if (reqAccount.updateMode === UpdateMode.UPDATE) {
              googleServiceAccountsExistingCopy[existAccountIndex] = {
                clientEmail: reqAccount.clientEmail
                  ? reqAccount.clientEmail
                  : existAccount.clientEmail,
                privateKey: reqAccount.privateKey
                  ? reqAccount.privateKey
                  : existAccount.privateKey,
                rootFolderId: reqAccount.rootFolderId
                  ? reqAccount.rootFolderId
                  : existAccount.rootFolderId,
              };
              updateAndDeleteCount--;
            }

            if (reqAccount.updateMode === UpdateMode.DELETE) {
              googleServiceAccountsExistingCopy.splice(
                existAccountIndex - deletionOffsetIndex,
                1,
              );
              deletionOffsetIndex++;
              updateAndDeleteCount--;
            }
          }
        },
      );
      if (updateAndDeleteCount !== 0) {
        throw new BadRequestException('Account does not exists');
      }
    });

    const result: GoogleServiceAccounts[] = [
      ...googleServiceAccountsExistingCopy,
      ...googleServiceAccountsRequestCopy,
    ];

    return result;
  }
}
