import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { GoogleRecaptchaModule } from '@nestlab/google-recaptcha';
import { USERS_REPOSITORY } from '@/configs/providersTokens';
import { getRecaptchaConfig } from '@/configs/recaptcha.config';
import { DatabaseModule } from '@/database/database.module';
import { StatsModule } from '../stats/stats.module';
import { AuthModule } from './auth/auth.module';
import { EmailConfirmationModule } from './auth/email-confirmation/email-confirmation.module';
import { UsersRepository } from './repository/users.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    JwtModule,
    AuthModule,
    EmailConfirmationModule,
    forwardRef(() => StatsModule),
    GoogleRecaptchaModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getRecaptchaConfig,
      inject: [ConfigService],
    }),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: USERS_REPOSITORY,
      useClass: UsersRepository,
    },
  ],
  exports: [USERS_REPOSITORY, UsersService],
})
export class UsersModule {}
