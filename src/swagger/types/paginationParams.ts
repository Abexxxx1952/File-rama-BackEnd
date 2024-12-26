import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationParams } from '../../database/paginationDto/pagination.dto';

export class PaginationParamsArgs implements PaginationParams {
  @ApiPropertyOptional({ example: 1 })
  offset?: number;

  @ApiPropertyOptional({ example: 10 })
  limit?: number;
}
