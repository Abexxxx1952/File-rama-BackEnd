import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class FindUsersByConditionsDto {
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  readonly id?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly name?: string;

  @IsOptional()
  @IsEmail()
  @IsNotEmpty()
  readonly email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly icon?: string;

  @IsOptional()
  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  readonly createdAt?: Date;

  @IsOptional()
  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  readonly updatedAt?: Date;
}
