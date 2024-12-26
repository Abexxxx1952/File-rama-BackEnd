import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserLocalDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly name?: string;

  @IsEmail()
  @IsNotEmpty()
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  readonly password: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly icon?: string;
}

export class CreateUserDtoLocalWithoutPassword extends CreateUserLocalDto {
  @Transform(({ obj }) => {
    return `[${typeof obj.password}]`;
  })
  readonly password: string;
}
