import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiUsersPostEmailConfirmationSendVerificationToken,
  ApiUsersPostEmailConfirmationTokenVerification,
} from '@/swagger/users';
import { SendTokenDto } from './dto/send-token.dto';
import { TokenVerificationDto } from './dto/token-verification.dto';
import { EmailConfirmationService } from './email-confirmation.service';

@Controller('v1/auth/email-confirmation')
export class EmailConfirmationController {
  constructor(
    private readonly emailConfirmationService: EmailConfirmationService,
  ) {}

  @Post('tokenVerification')
  @HttpCode(HttpStatus.OK)
  @ApiUsersPostEmailConfirmationTokenVerification()
  public async tokenVerification(
    @Body() tokenVerificationDto: TokenVerificationDto,
  ) {
    return this.emailConfirmationService.tokenVerification(
      tokenVerificationDto,
    );
  }

  @Post('sendToken')
  @HttpCode(HttpStatus.OK)
  @ApiUsersPostEmailConfirmationSendVerificationToken()
  public async sendToken(@Body() sendTokenDto: SendTokenDto) {
    return this.emailConfirmationService.sendVerificationToken(
      sendTokenDto.email,
    );
  }
}
