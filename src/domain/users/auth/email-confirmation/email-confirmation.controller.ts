import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/currentUser.decorator';
import {
  ApiUsersPostEmailConfirmationSendVerificationToken,
  ApiUsersPostEmailConfirmationSendVerificationTokenFromHeaders,
  ApiUsersPostEmailConfirmationTokenVerification,
} from '@/swagger/users';
import { AccessTokenAuthGuardFromCookies } from '../guards/access-token-from-cookies.guard';
import { AccessTokenAuthGuardFromHeaders } from '../guards/access-token-from-headers.guard';
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
  ): Promise<{ message: string }> {
    return this.emailConfirmationService.tokenVerification(
      tokenVerificationDto,
    );
  }

  @Post('sendToken')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @ApiUsersPostEmailConfirmationSendVerificationToken()
  public async sendToken(
    @CurrentUser('email') currentUserEmail: string,
  ): Promise<{ message: string }> {
    return this.emailConfirmationService.sendVerificationToken(
      currentUserEmail,
    );
  }

  @Post('sendTokenFromHeaders')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenAuthGuardFromHeaders)
  @ApiUsersPostEmailConfirmationSendVerificationTokenFromHeaders()
  public async sendTokenFromHeaders(
    @CurrentUser('email') currentUserEmail: string,
  ): Promise<{ message: string }> {
    return this.emailConfirmationService.sendVerificationToken(
      currentUserEmail,
    );
  }
}
