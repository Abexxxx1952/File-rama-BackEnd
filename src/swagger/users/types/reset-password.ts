import { ApiProperty } from '@nestjs/swagger';
import { ResetPasswordDto } from '@/domain/users/auth/password-recovery/dto/reset-password.dto';

export class ResetPasswordArgs implements ResetPasswordDto {
  @ApiProperty()
  email: string;
}
