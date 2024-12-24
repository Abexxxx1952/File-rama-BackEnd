import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationParams {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
