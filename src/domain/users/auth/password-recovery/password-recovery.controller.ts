import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { Recaptcha } from '@nestlab/google-recaptcha';
import {
  ApiUsersPostPasswordRecoveryRequestPasswordRecovery,
  ApiUsersPostPasswordRecoveryResetPassword,
} from '@/swagger/users';
import { NewPasswordDto } from './dto/new-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordRecoveryService } from './password-recovery.service';

@Controller('v1/auth/password-recovery')
export class PasswordRecoveryController {
  constructor(
    private readonly passwordRecoveryService: PasswordRecoveryService,
  ) {}

  @Recaptcha()
  @Post('request-password-recovery')
  @HttpCode(HttpStatus.CREATED)
  @ApiUsersPostPasswordRecoveryRequestPasswordRecovery()
  public async requestPasswordRecovery(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const result =
      this.passwordRecoveryService.requestPasswordRecovery(resetPasswordDto);

    return result;
  }

  @Recaptcha()
  @Post('reset-password/:token')
  @HttpCode(HttpStatus.OK)
  @ApiUsersPostPasswordRecoveryResetPassword()
  public async resetPassword(
    @Body() newPasswordDto: NewPasswordDto,
    @Param('token') token: string,
  ): Promise<{ message: string }> {
    return this.passwordRecoveryService.resetPassword(newPasswordDto, token);
  }
}
