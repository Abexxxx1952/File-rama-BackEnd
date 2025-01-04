import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { resendConfig } from '../configs/mailer.config';
import { MailService } from './mail.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [resendConfig],
    }),
  ],
  providers: [
    MailService,
    {
      provide: 'Resend',
      useFactory: (configService: ConfigService) => {
        return new Resend(configService.get<string>('resendConfig.apiKey'));
      },
      inject: [ConfigService],
    },
  ],
  exports: [MailService],
})
export class MailModule {}
