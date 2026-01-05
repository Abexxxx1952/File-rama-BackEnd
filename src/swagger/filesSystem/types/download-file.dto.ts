import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';

export class DownloadFileArgs {
  @ApiProperty()
  readonly fileId: UUID;
}
