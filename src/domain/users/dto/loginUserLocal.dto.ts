import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginLocalUserDto {
  @IsEmail()
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  readonly password: string;
}

export class LoginLocalUserDtoWithoutPassword extends LoginLocalUserDto {
  @Transform(({ obj }) => {
    return `[${typeof obj.password}]`;
  })
  readonly password: string;
}
