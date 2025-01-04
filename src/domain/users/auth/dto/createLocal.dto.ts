import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Validate,
} from 'class-validator';
import { IsPasswordsMatchingConstraint } from '@/common/decorators/isPasswordMatchingConstraint.decorator';

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

  @IsString()
  @IsNotEmpty()
  @Validate(IsPasswordsMatchingConstraint)
  readonly passwordRepeat: string;

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

  @Transform(({ obj }) => {
    return `[${typeof obj.passwordRepeat}]`;
  })
  readonly passwordRepeat: string;
}
