import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { RegistrationSources } from '../auth/types/providers-oauth.enum';
import { UsersPermissionsKeys } from '../permissions/users-permissions';

export class FindUserByConditionsDto {
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
