import { ApiProperty } from '@nestjs/swagger';
import { SendTokenDto } from '@/domain/users/auth/email-confirmation/dto/send-token.dto';

export class SendTokenArgs implements SendTokenDto {
  @ApiProperty()
  email: string;
}
