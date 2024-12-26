import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FindUserByConditionsArgs } from './findUserByConditions';
import { PaginationParamsArgs } from '../../types/paginationParams';

export class FindUsersByConditionWithPaginationParams {
  @ApiProperty()
  condition: FindUserByConditionsArgs;

  @ApiPropertyOptional()
  paginationParams?: PaginationParamsArgs;
}
