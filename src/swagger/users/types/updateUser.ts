import { ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateUserDto } from '../../../domain/users/dto/update.dto';
import { PayloadModel } from './payload';
import { Payload } from '../../../domain/users/types/payload';
export class UpdateUserArgs implements UpdateUserDto {
  @ApiPropertyOptional()
  readonly name?: string;

  @ApiPropertyOptional()
  readonly password?: string;

  @ApiPropertyOptional()
  readonly icon?: string;

  @ApiPropertyOptional({ type: PayloadModel, isArray: true })
  readonly payload?: Payload[];
}
