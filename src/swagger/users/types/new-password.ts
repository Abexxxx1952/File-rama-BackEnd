import { ApiProperty } from '@nestjs/swagger';
import { NewPasswordDto } from '@/domain/users/auth/password-recovery/dto/new-password.dto';

export class NewPasswordArgs implements NewPasswordDto {
  @ApiProperty()
  password: string;
}
