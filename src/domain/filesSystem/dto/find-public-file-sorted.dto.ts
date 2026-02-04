import { IsIn, IsNotEmpty, IsOptional } from 'class-validator';
import { SortOrder } from '@/database/types/sort';
import { File } from '../types/file';

export class FindFilesSortedDto {
  @IsNotEmpty()
  key: keyof File;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: SortOrder;
}
