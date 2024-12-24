import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../database/database.module';
import { BaseAbstractRepository } from '../../../database/abstractRepository/base.abstract.repository';
import { usersSchema } from '../schema/users.schema';
import * as bcrypt from 'bcrypt';
import { RegistrationSources } from '../auth/types/providersOAuth.enum';
import { CreateUserDto } from '../dto/create.dto';
import { UpdateUserDto } from '../dto/update.dto';
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
  ) {
    super(database, usersSchema, 'User');
  }
  public async createUserLocal(
    createUserLocalDto: CreateUserDto,
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

      const entity = {
        ...createUserLocalDto,
        password: hashedPassword,
        registrationSources: [RegistrationSources.Local],
        files: [],
      };

      const user = await this.create(entity);

      return user;
    } catch (error) {
      throw error;
    }
  }
  public async createUserOAuth(
    createUserOAuthDto: CreateUserDto,
  ): Promise<User> {
    try {
      const entity = {
        ...createUserOAuthDto,
        registrationSources: [RegistrationSources.Local],
        files: [],
      };

      const user = await this.create(entity);

      return user;
    } catch (error) {
      throw error;
    }
  }

  public async status(email: string): Promise<User> {
    try {
      return await this.findOneByCondition({ email });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ForbiddenException('Access Denied');
      }
      throw error;
    }
  }

  public async updateUserById(id: string, data: UpdateUserDto): Promise<User> {
    let dataUpdate: User;
    if (data.password) {
      dataUpdate.password = await this.hashPassword(data.password);

      let existUser: User;
      try {
        existUser = await this.findById(id);
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
    dataUpdate = { ...data, ...dataUpdate };
    try {
      return await this.updateById(id, dataUpdate);
    } catch (error) {
      throw error;
    }
  }

  public async removeUserById(id: string): Promise<User> {
    try {
      const user = await this.deleteById(id);

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ForbiddenException('Access Denied');
      }
      throw error;
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const saltOrRounds = 10;
    return await bcrypt.hash(password, saltOrRounds);
  }
}
