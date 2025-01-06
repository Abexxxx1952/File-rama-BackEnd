import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class LoginLocalUserDto {
  @IsEmail()
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  readonly password: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly twoFactorVerificationCode?: string;
}

export class LoginLocalUserDtoWithoutPassword extends LoginLocalUserDto {
  @Transform(({ obj }) => {
    return `[${typeof obj.password}]`;
  })
  readonly password: string;
}
