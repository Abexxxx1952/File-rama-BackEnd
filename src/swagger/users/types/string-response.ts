import { ApiProperty } from '@nestjs/swagger';

export class StringResponseArgs {
  @ApiProperty()
  readonly message: string;
}
