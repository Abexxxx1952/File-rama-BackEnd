import { ApiProperty } from '@nestjs/swagger';
import { Payload } from '../../../domain/users/types/payload';

export class PayloadModel implements Payload {
  @ApiProperty()
  key: string;
  @ApiProperty()
  value: string;
}
