import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getMailerConfig } from '../configs/mailer.config';
import { MailService } from './mail.service';

@Module({
  imports: [
    ConfigModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getMailerConfig,
      inject: [ConfigService],
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
