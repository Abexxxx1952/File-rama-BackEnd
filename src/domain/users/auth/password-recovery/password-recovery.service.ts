import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TOKENS_REPOSITORY, USERS_REPOSITORY } from '@/configs/providersTokens';
import { MailService } from '@/mail/mail.service';
import { UsersRepository } from '../../repository/users.repository';
import { TokensRepository } from '../repository/tokens.repository';
import { Token, TokenTypeEnum } from '../types/token';
import { NewPasswordDto } from './dto/new-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class PasswordRecoveryService {
  public constructor(
    @Inject(TOKENS_REPOSITORY)
    private readonly tokensRepository: TokensRepository,
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    private readonly mailService: MailService,
  ) {}

  public async requestPasswordRecovery(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    try {
      const existingUser = await this.usersRepository.findOneByCondition({
        email: resetPasswordDto.email,
      });

      const passwordResetToken = await this.generatePasswordResetToken(
        existingUser.email,
      );

      await this.mailService.sendPasswordResetEmail(
        passwordResetToken.email,
        passwordResetToken.tokenValue,
      );

      return {
        message: 'One-time password sent successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  public async resetPassword(
    newPasswordDto: NewPasswordDto,
    token: string,
  ): Promise<{ message: string }> {
    try {
      const existingToken = await this.tokensRepository.findOneByCondition({
        tokenValue: token,
        tokenType: TokenTypeEnum.PASSWORD_RESET,
      });

      const hasExpired = new Date(existingToken.expiresIn) < new Date();

      if (hasExpired) {
        throw new BadRequestException();
      }

      const hashedPassword = await this.usersRepository.hashPassword(
        newPasswordDto.password,
      );

      await this.usersRepository.updateByCondition(
        { email: existingToken.email },
        {
          password: hashedPassword,
        },
      );

      await this.tokensRepository.deleteByCondition({
        tokenValue: token,
        tokenType: TokenTypeEnum.PASSWORD_RESET,
      });

      return {
        message: 'Password updated',
      };
    } catch (error) {
      throw error;
    }
  }

  private async generatePasswordResetToken(email: string): Promise<Token> {
    const token = uuidv4();
    const expiresIn = new Date(new Date().getTime() + 900 * 1000); // 15 minutes
    try {
      await this.tokensRepository.deleteByCondition({
        email,
        tokenType: TokenTypeEnum.PASSWORD_RESET,
      });
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }
    try {
      const passwordResetToken = await this.tokensRepository.create({
        email,
        tokenValue: token,
        expiresIn,
        tokenType: TokenTypeEnum.PASSWORD_RESET,
      });

      return passwordResetToken;
    } catch (error) {
      throw error;
    }
  }
}
