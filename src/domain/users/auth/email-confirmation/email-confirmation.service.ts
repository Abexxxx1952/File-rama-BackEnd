import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { v4 as uuidv4 } from 'uuid';
import { TOKENS_REPOSITORY, USERS_REPOSITORY } from '@/configs/providersTokens';
import { UsersRepository } from '@/domain/users/repository/users.repository';
import { MailService } from '@/mail/mail.service';
import { TokensRepository } from '../repository/tokens.repository';
import { Token, TokenTypeEnum } from '../types/token';
import { TokenVerificationDto } from './dto/token-verification.dto';

@Injectable()
export class EmailConfirmationService {
  private usersRepository: UsersRepository;
  public constructor(
    @Inject(TOKENS_REPOSITORY)
    private readonly tokensRepository: TokensRepository,
    private readonly mailService: MailService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async onModuleInit() {
    this.usersRepository = this.moduleRef.get(USERS_REPOSITORY, {
      strict: false,
    });
  }

  public async tokenVerification(
    tokenVerificationDto: TokenVerificationDto,
  ): Promise<{ message: string }> {
    try {
      const existingToken = await this.tokensRepository.findOneByCondition({
        tokenValue: tokenVerificationDto.token,
        tokenType: TokenTypeEnum.VERIFICATION,
      });

      const hasExpired = new Date(existingToken.expiresIn) < new Date();

      if (hasExpired) {
        throw new BadRequestException();
      }

      await this.usersRepository.updateByCondition(
        { email: existingToken.email },
        {
          isVerified: true,
        },
      );

      await this.tokensRepository.deleteById(existingToken.id);

      return {
        message: 'Mail confirmed',
      };
    } catch (error) {
      throw error;
    }
  }

  public async sendVerificationToken(
    email: string,
  ): Promise<{ message: string }> {
    try {
      const verificationToken = await this.generateVerificationToken(email);

      await this.mailService.sendConfirmationEmail(
        verificationToken.email,
        verificationToken.tokenValue,
      );

      return {
        message: 'Verification token sended',
      };
    } catch (error) {
      throw error;
    }
  }

  private async generateVerificationToken(email: string): Promise<Token> {
    const token = uuidv4();
    const expiresIn = new Date(new Date().getTime() + 900 * 1000); // 15 minutes
    try {
      await this.tokensRepository.deleteByCondition({
        email,
        tokenType: TokenTypeEnum.VERIFICATION,
      });
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }

    try {
      const verificationToken = await this.tokensRepository.create({
        email,
        tokenValue: token,
        expiresIn,
        tokenType: TokenTypeEnum.VERIFICATION,
      });

      return verificationToken;
    } catch (error) {
      throw error;
    }
  }
}
