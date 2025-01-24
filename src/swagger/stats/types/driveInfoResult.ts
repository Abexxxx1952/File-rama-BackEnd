import { ApiProperty } from '@nestjs/swagger';
import { DriveInfoResult } from '@/domain/stats/types/driveInfoResult';

export class DriveInfoResultModel implements DriveInfoResult {
  @ApiProperty()
  driveEmail: string;

  @ApiProperty()
  totalSpace: number;

  @ApiProperty()
  usedSpace: number;

  @ApiProperty()
  availableSpace: number;
}
