import { ApiPropertyOptional } from '@nestjs/swagger';
import { FindUserByConditionsDto } from '../../../domain/users/dto/find-by-conditions.dto';

export class FindUserByConditionsArgs implements FindUserByConditionsDto {
  @ApiPropertyOptional({ type: 'string', format: 'UUID' })
  readonly id?: string;

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
