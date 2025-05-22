import { ApiPropertyOptional } from '@nestjs/swagger';
import { GoogleServiceAccountsDto } from '@/domain/users/dto/google-service-accounts';
import { UpdateUserDto } from '../../../domain/users/dto/update.dto';
import { Payloads } from '../../../domain/users/types/payloads';
import { GoogleServiceAccountsModel } from './google-service-accounts';
import { PayloadModel } from './payload';

export class UpdateUserArgs implements UpdateUserDto {
  @ApiPropertyOptional()
  readonly name?: string;

  @ApiPropertyOptional()
  readonly password?: string;

  @ApiPropertyOptional()
  readonly icon?: string;

  @ApiPropertyOptional({ type: PayloadModel, isArray: true })
  readonly payloads?: Payloads[];

  @ApiPropertyOptional({ type: GoogleServiceAccountsModel, isArray: true })
  readonly googleServiceAccounts?: GoogleServiceAccountsDto[];

  @ApiPropertyOptional({ type: 'boolean' })
  readonly isTwoFactorEnabled?: boolean;
}
