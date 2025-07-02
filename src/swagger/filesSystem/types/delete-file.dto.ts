import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';

export class DeleteFileArgs {
  @ApiProperty()
  readonly fileId: UUID;
}
