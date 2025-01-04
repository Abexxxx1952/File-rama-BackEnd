import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { GoogleRecaptchaModule } from '@nestlab/google-recaptcha';
import { getRecaptchaConfig } from '../../configs/recaptcha.config';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from './auth/auth.module';
import { EmailConfirmationModule } from './auth/email-confirmation/email-confirmation.module';
import { UsersRepository } from './repository/users.repository';
import { UsersController } from './users.controller';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    JwtModule,
    AuthModule,
    EmailConfirmationModule,
    GoogleRecaptchaModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getRecaptchaConfig,
      inject: [ConfigService],
    }),
  ],
  controllers: [UsersController],
  providers: [
    {
      provide: 'UsersRepository',
      useClass: UsersRepository,
    },
  ],
  exports: ['UsersRepository'],
})
export class UsersModule {}
