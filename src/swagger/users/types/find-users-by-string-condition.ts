import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationParamsArgs } from '../../types/paginationParams';
import { FindUserByConditionsArgs } from './find-user-by-conditions';

export class FindUsersByConditionWithPaginationParams {
  @ApiProperty()
  condition: FindUserByConditionsArgs;

  @ApiPropertyOptional()
  paginationParams?: PaginationParamsArgs;
}
