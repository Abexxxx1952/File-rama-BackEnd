import { BadRequestException } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class IsFolderFirstDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new BadRequestException('isFolderFirst must be boolean');
  })
  @IsBoolean()
  isFolderFirst: boolean;
}
