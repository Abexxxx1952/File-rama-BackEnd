import { forwardRef, Module } from '@nestjs/common';
import { MailModule } from '@/mail/mail.module';
import { UsersModule } from '../../users.module';
import { AuthModule } from '../auth.module';
import { EmailConfirmationController } from './email-confirmation.controller';
import { EmailConfirmationService } from './email-confirmation.service';

@Module({
  imports: [
    MailModule,
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [EmailConfirmationController],
  providers: [EmailConfirmationService],
  exports: [EmailConfirmationService],
})
export class EmailConfirmationModule {}
