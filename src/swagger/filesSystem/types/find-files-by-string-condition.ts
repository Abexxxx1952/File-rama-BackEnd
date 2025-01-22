import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationParamsArgs } from '../../types/paginationParams';
import { FindFileByConditionsArgs } from './find-file-by-conditions';

export class FindFilesByConditionWithPaginationParamsArgs {
  @ApiProperty()
  condition: FindFileByConditionsArgs;

  @ApiPropertyOptional()
  paginationParams?: PaginationParamsArgs;
}
