import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Payloads } from '../types/payloads';
import { GoogleServiceAccountsDto } from './google-service-accounts';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly password?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly icon?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Payloads)
  readonly payload?: Payloads[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoogleServiceAccountsDto)
  googleServiceAccounts?: GoogleServiceAccountsDto[];

  @IsOptional()
  @IsBoolean()
  readonly isTwoFactorEnabled?: boolean;
}

export class UpdateUserDtoLocalWithoutPasswords extends UpdateUserDto {
  @Transform(({ obj }) => {
    return `[${typeof obj.password}]`;
  })
  readonly password: string;

  @Transform(({ obj }) => {
    return `[clientEmail: ${obj.googleServiceAccounts.clientEmail}; privateKey:${typeof obj.googleServiceAccounts}; rootFolderId: ${obj.googleServiceAccounts.rootFolderId}]`;
  })
  readonly googleServiceAccounts: GoogleServiceAccountsDto[];
}
