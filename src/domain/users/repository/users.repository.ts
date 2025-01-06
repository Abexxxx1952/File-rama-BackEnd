import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { BaseAbstractRepository } from '../../../database/abstractRepository/base.abstract.repository';
import { DATABASE_CONNECTION } from '../../../database/database.module';
import { CreateUserLocalDto } from '../auth/dto/createLocal.dto';
import { EmailConfirmationService } from '../auth/email-confirmation/email-confirmation.service';
import { ParseUserOAuth } from '../auth/types/parse-user-oauth';
import { RegistrationSources } from '../auth/types/providers-oauth.enum';
import { usersSchema } from '../schema/users.schema';
import { User } from '../types/users';

@Injectable()
export class UsersRepository extends BaseAbstractRepository<
  User,
  typeof usersSchema
> {
  private readonly uniqueProperty: string = 'email';
  constructor(
    @Inject(DATABASE_CONNECTION)
    public readonly database: NodePgDatabase<
      Record<'users', typeof usersSchema>
    >,
    private readonly emailConfirmationService: EmailConfirmationService,
  ) {
    super(database, usersSchema, 'User');
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
        throw new ConflictException(errorResponse);
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

  public async updateUserById(id: string, data: Partial<User>): Promise<User> {
    let dataUpdate: User;
    if (data.password) {
      let existUser: User;
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
    dataUpdate = { ...data, ...dataUpdate, updatedAt: new Date() };
    try {
      const user = await this.updateById(id, dataUpdate);
      return user;
    } catch (error) {
      throw error;
    }
  }

  public async hashPassword(password: string): Promise<string> {
    const saltOrRounds = 10;
    return await bcrypt.hash(password, saltOrRounds);
  }
}
