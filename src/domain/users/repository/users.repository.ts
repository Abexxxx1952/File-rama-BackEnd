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
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { STATS_REPOSITORY } from '@/configs/providersTokens';
import { DATABASE_CONNECTION } from '@/configs/providersTokens';
import { BaseAbstractRepository } from '@/database/abstractRepository/base.abstract.repository';
import { filesSchema } from '@/domain/filesSystem/schema/files.schema';
import { foldersSchema } from '@/domain/filesSystem/schema/folder.schema';
import { StatsRepository } from '@/domain/stats/repository/stats.repository';
import { statsSchema } from '@/domain/stats/schema/stats.schema';
import { Stat } from '@/domain/stats/types/stat';
import { CreateUserLocalDto } from '../auth/dto/register-local.dto';
import { EmailConfirmationService } from '../auth/email-confirmation/email-confirmation.service';
import { ParseUserOAuth } from '../auth/types/parse-user-oauth';
import { RegistrationSources } from '../auth/types/providers-oauth.enum';
import {
  GoogleServiceAccountsDto,
  UpdateMode,
} from '../dto/google-service-accounts';
import { UpdateUserDto } from '../dto/update.dto';
import { usersSchema } from '../schema/users.schema';
import { GoogleServiceAccounts } from '../types/google-service-accounts';
import { User } from '../types/users';

@Injectable()
export class UsersRepository extends BaseAbstractRepository<
  User,
  typeof usersSchema
> {
  private readonly uniqueProperty: string = 'email';
  private readonly pepper: string;
  private readonly saltRounds = 10;
  constructor(
    @Inject(DATABASE_CONNECTION)
    public readonly database: NodePgDatabase<
      Record<'users', typeof usersSchema>
    >,
    private readonly configService: ConfigService,
    private readonly emailConfirmationService: EmailConfirmationService,
    @Inject(STATS_REPOSITORY)
    private readonly statsRepository: StatsRepository,
  ) {
    super(database, usersSchema, 'User');
    this.relatedTables = {
      folders: {
        table: foldersSchema,
        ownField: foldersSchema.userId,
        relationField: usersSchema.id,
      },
      files: {
        table: filesSchema,
        ownField: filesSchema.userId,
        relationField: usersSchema.id,
      },
      stats: {
        table: statsSchema,
        ownField: statsSchema.userId,
        relationField: usersSchema.id,
      },
    };
    this.pepper = this.configService.getOrThrow<string>('PASSWORD_PEPPER');
  }
  public async createUserLocal(
    createUserLocalDto: CreateUserLocalDto,
  ): Promise<User> {
    const errorResponse = {
      errors: {},
    };

    try {
      const user = await this.findOneByCondition({
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

      const user = await this.create(entity);

      await this.emailConfirmationService.sendVerificationToken(entity.email);

      await this.createStats(user.id, user.googleServiceAccounts);

      return user;
    } catch (error) {
      throw error;
    }
  }
  public async createUserOAuth(
    createUserOAuthDto: ParseUserOAuth,
  ): Promise<User> {
    try {
      const entity = {
        ...createUserOAuthDto,
        registrationSources: [RegistrationSources.Local],
      };

      const user = await this.create(entity);

      await this.createStats(user.id, user.googleServiceAccounts);

      return user;
    } catch (error) {
      throw error;
    }
  }

  public async status(email: string): Promise<User> {
    try {
      const user = await this.findOneByCondition({ email });
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ForbiddenException('Access Denied');
      }
      throw error;
    }
  }

  public async updateUserById(id: string, data: UpdateUserDto): Promise<User> {
    let dataUpdate: Partial<User> = {};
    let existUser: User;

    if (data.password) {
      try {
        existUser = await this.findById(id);
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
          existUser = await this.findById(id);
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
      const user = await this.updateById(id, dataUpdate);

      if (dataUpdate.googleServiceAccounts) {
        await this.updateStats(user.id, user.googleServiceAccounts);
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  public async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password + this.pepper, this.saltRounds);
  }

  private async createStats(
    id: UUID,
    googleServiceAccounts: GoogleServiceAccounts[],
  ): Promise<Stat> {
    const totalSize = googleServiceAccounts.length * 15 * 1024 * 1024 * 1024; // 15GB per account

    const initialUserStats = {
      userId: id,
      fileCount: 0,
      folderCount: 0,
      totalSize,
      usedSize: 0,
    };

    const result = await this.statsRepository.create(initialUserStats);

    return result;
  }

  private async updateStats(
    id: UUID,
    googleServiceAccounts: GoogleServiceAccounts[],
  ): Promise<Stat> {
    const totalSize = googleServiceAccounts.length * 15 * 1024 * 1024 * 1024; // 15GB per account

    const result = await this.statsRepository.updateByCondition(
      { userId: id },
      { totalSize },
    );

    return result[0];
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
