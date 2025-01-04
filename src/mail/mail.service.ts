import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/components';
import { Resend } from 'resend';
import { ConfirmationTemplate } from './templates/confirmation.template';
import { ResetPasswordTemplate } from './templates/reset-password.template';
import { TwoFactorAuthTemplate } from './templates/two-factor-auth.template';

@Injectable()
export class MailService {
  public constructor(
    private readonly configService: ConfigService,
    @Inject('Resend') private readonly resend: Resend,
  ) {}

  public async sendConfirmationEmail(email: string, token: string) {
    const domain = this.configService.getOrThrow<string>('CLIENT_DOMAIN_URL');
    const html = await render(ConfirmationTemplate({ domain, token }));

    return this.sendMail(email, 'Email confirmation', html);
  }

  public async sendPasswordResetEmail(email: string, token: string) {
    const domain = this.configService.getOrThrow<string>('CLIENT_DOMAIN_URL');
    const html = await render(ResetPasswordTemplate({ domain, token }));

    return this.sendMail(email, 'Password reset', html);
  }

  public async sendTwoFactorTokenEmail(email: string, token: string) {
    const html = await render(TwoFactorAuthTemplate({ token }));

    return this.sendMail(email, 'Verifying your identity', html);
  }

  private async sendMail(
    email: string,
    subject: string,
    html: string,
  ): Promise<string> {
    const mailFrom = this.configService.getOrThrow<string>('MAIL_SEND_FROM');
    try {
      await this.resend.emails.send({
        from: mailFrom,
        to: email,
        subject,
        html,
      });
    } catch (error) {
      throw new Error(error.message);
    }
    return 'Email sent successfully';
  }
}
