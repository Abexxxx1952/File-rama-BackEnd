import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/components';
import { ConfirmationTemplate } from './templates/confirmation.template';
import { ResetPasswordTemplate } from './templates/reset-password.template';
import { TwoFactorAuthTemplate } from './templates/two-factor-auth.template';

@Injectable()
export class MailService {
  private readonly clientDomainUrl: string;
  public constructor(
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {
    this.clientDomainUrl =
      this.configService.getOrThrow<string>('CLIENT_DOMAIN_URL');
  }

  public async sendConfirmationEmail(email: string, token: string) {
    const domain = this.clientDomainUrl;
    const html = await render(ConfirmationTemplate({ domain, token }));

    return this.sendMail(email, 'Email confirmation', html);
  }

  public async sendPasswordResetEmail(email: string, token: string) {
    const domain = this.clientDomainUrl;
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
    try {
      await this.mailerService.sendMail({
        to: email,
        subject,
        html,
      });

      return 'Email sent successfully';
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
