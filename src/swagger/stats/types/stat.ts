import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { Stat } from '@/domain/stats/types/stat';
import { DriveInfoResultModel } from './driveInfoResult';

export class StatModel implements Stat {
  @ApiProperty({ type: 'string', format: 'UUID' })
  id: UUID;

  @ApiProperty({ type: 'string', format: 'UUID' })
  userId: UUID;

  @ApiProperty()
  fileCount: number;

  @ApiProperty()
  folderCount: number;

  @ApiProperty()
  totalSize: number;

  @ApiProperty()
  usedSize: number;

  driveInfoResult: DriveInfoResultModel[];
}
