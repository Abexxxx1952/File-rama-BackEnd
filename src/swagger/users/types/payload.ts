import { ApiProperty } from '@nestjs/swagger';
import { Payloads } from '../../../domain/users/types/payloads';

export class PayloadModel implements Payloads {
  @ApiProperty()
  key: string;
  @ApiProperty()
  value: string;
}
