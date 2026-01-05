import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TOKENS_REPOSITORY } from '@/configs/providersTokens';
import { DatabaseModule } from '@/database/database.module';
import { UsersModule } from '../users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailConfirmationModule } from './email-confirmation/email-confirmation.module';
import { PasswordRecoveryModule } from './password-recovery/password-recovery.module';
import { TokensRepository } from './repository/tokens.repository';
import { TwoFactorAuthModule } from './two-factor-auth/two-factor-auth.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    JwtModule,
    forwardRef(() => UsersModule),
    EmailConfirmationModule,
    PasswordRecoveryModule,
    TwoFactorAuthModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: TOKENS_REPOSITORY,
      useClass: TokensRepository,
    },
  ],
  exports: [TOKENS_REPOSITORY],
})
export class AuthModule {}
