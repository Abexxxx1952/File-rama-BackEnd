import { ApiProperty } from '@nestjs/swagger';
import { TokenVerificationDto } from '@/domain/users/auth/email-confirmation/dto/token-verification.dto';

export class TokenVerificationArgs implements TokenVerificationDto {
  @ApiProperty()
  readonly token: string;
}
