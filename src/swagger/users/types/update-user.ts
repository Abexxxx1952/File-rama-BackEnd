import { ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateUserDto } from '../../../domain/users/dto/update.dto';
import { Payloads } from '../../../domain/users/types/payloads';
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
}
