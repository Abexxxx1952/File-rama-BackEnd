import { IsIn, IsNotEmpty, IsOptional } from 'class-validator';
import { SortOrder } from '@/database/types/sort';
import { User } from '../types/users';

export class UsersSortedDto {
  @IsNotEmpty()
  key: keyof User;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: SortOrder;
}
