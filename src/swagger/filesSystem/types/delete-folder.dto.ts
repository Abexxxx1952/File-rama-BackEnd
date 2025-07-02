import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';

export class DeleteFolderArgs {
  @ApiProperty({ type: 'string', format: 'UUID' })
  readonly folderId: UUID;
}
