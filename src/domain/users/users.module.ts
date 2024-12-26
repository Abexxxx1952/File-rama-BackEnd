import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { AuthModule } from './auth/auth.module';
import { UsersRepository } from './repository/users.repository';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [UsersController],
  providers: [
    {
      provide: 'UsersRepository',
      useClass: UsersRepository,
    },
  ],
  exports: [],
})
export class UsersModule {}
