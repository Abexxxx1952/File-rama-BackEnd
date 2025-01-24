import { ApiPropertyOptional } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { FindUsersByConditionsDto } from '../../../domain/users/dto/find-by-conditions.dto';

export class FindUserByConditionsArgs implements FindUsersByConditionsDto {
  @ApiPropertyOptional({ type: 'string', format: 'UUID' })
  readonly id?: UUID;

  @ApiPropertyOptional()
  readonly name?: string;

  @ApiPropertyOptional({ type: 'string', format: 'email' })
  readonly email?: string;

  @ApiPropertyOptional()
  readonly icon?: string;

  @ApiPropertyOptional()
  readonly createdAt?: Date;

  @ApiPropertyOptional()
  readonly updatedAt?: Date;
}
