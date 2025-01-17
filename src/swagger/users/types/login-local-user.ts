import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoginLocalUserDto } from '../../../domain/users/auth/dto/login-user-local.dto';

export class LoginLocalUser implements LoginLocalUserDto {
  @ApiProperty({ type: 'string', format: 'email' })
  readonly email: string;

  @ApiProperty({ type: 'string', format: 'password' })
  readonly password: string;

  @ApiPropertyOptional({ type: 'string', format: 'string' })
  twoFactorVerificationCode?: string;
}
