import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { MailService } from '@/mail/mail.service';
import { TokensRepository } from '../repository/tokens.repository';
import { Token, TokenTypeEnum } from '../types/token';

@Injectable()
export class TwoFactorAuthService {
  public constructor(
    @Inject('TokensRepository')
    private readonly tokensRepository: TokensRepository,
    private readonly mailService: MailService,
  ) {}

  public async validateTwoFactorToken(
    email: string,
    token: string,
  ): Promise<{ message: string }> {
    try {
      const existingToken = await this.tokensRepository.findOneByCondition({
        email,
        tokenType: TokenTypeEnum.TWO_FACTOR,
      });

      const hasExpired = new Date(existingToken.expiresIn) < new Date();

      if (existingToken.tokenValue !== token || hasExpired) {
        throw new BadRequestException();
      }

      await this.tokensRepository.deleteById(existingToken.id);

      return {
        message: 'Token verified',
      };
    } catch (error) {
      throw error;
    }
  }

  public async sendTwoFactorToken(email: string): Promise<{ message: string }> {
    try {
      const twoFactorToken = await this.generateTwoFactorToken(email);

      await this.mailService.sendTwoFactorTokenEmail(
        twoFactorToken.email,
        twoFactorToken.tokenValue,
      );

      return {
        message: 'Token sended',
      };
    } catch (error) {
      throw error;
    }
  }

  private async generateTwoFactorToken(email: string): Promise<Token> {
    const token = Math.floor(
      Math.random() * (1000000 - 100000) + 100000,
    ).toString();
    const expiresIn = new Date(new Date().getTime() + 300000); // 5 minutes
    try {
      await this.tokensRepository.deleteByCondition({
        email,
        tokenType: TokenTypeEnum.TWO_FACTOR,
      });

      const twoFactorToken = await this.tokensRepository.create({
        email,
        tokenValue: token,
        expiresIn,
        tokenType: TokenTypeEnum.TWO_FACTOR,
      });

      return twoFactorToken;
    } catch (error) {
      throw error;
    }
  }
}
