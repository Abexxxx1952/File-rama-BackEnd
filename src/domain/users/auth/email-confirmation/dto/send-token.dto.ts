import { IsNotEmpty, IsString } from 'class-validator';

export class SendTokenDto {
  @IsString()
  @IsNotEmpty()
  email: string;
}
