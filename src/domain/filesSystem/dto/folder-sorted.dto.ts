import { IsIn, IsNotEmpty, IsOptional } from 'class-validator';
import { SortOrder } from '@/database/types/sort';
import { Folder } from '../types/folder';

export class FolderSortedDto {
  @IsNotEmpty()
  column: keyof Folder;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: SortOrder;
}
