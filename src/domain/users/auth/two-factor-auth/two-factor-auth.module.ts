import { forwardRef, Module } from '@nestjs/common';
import { MailModule } from '@/mail/mail.module';
import { AuthModule } from '../auth.module';
import { TwoFactorAuthService } from './two-factor-auth.service';

@Module({
  imports: [MailModule, forwardRef(() => AuthModule)],
  providers: [TwoFactorAuthService],
  exports: [TwoFactorAuthService],
})
export class TwoFactorAuthModule {}
