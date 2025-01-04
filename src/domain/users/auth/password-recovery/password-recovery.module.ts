import { forwardRef, Module } from '@nestjs/common';
import { MailModule } from '@/mail/mail.module';
import { UsersModule } from '../../users.module';
import { AuthModule } from '../auth.module';
import { PasswordRecoveryController } from './password-recovery.controller';
import { PasswordRecoveryService } from './password-recovery.service';

@Module({
  imports: [
    MailModule,
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [PasswordRecoveryController],
  providers: [PasswordRecoveryService],
})
export class PasswordRecoveryModule {}
