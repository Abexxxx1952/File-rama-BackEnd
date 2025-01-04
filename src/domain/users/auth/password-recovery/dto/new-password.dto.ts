import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class NewPasswordDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}
