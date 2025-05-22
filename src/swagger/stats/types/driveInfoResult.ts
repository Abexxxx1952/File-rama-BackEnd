import { ApiProperty } from '@nestjs/swagger';
import {
  DriveInfoErrorResult,
  DriveInfoSuccessResult,
} from '@/domain/stats/types/driveInfoResult';

export class DriveInfoSuccessResultModel implements DriveInfoSuccessResult {
  @ApiProperty()
  driveEmail: string;

  @ApiProperty()
  totalSpace: number;

  @ApiProperty()
  usedSpace: number;

  @ApiProperty()
  availableSpace: number;
}

export class DriveInfoErrorResultModel implements DriveInfoErrorResult {
  @ApiProperty()
  driveEmail: string;

  @ApiProperty({ enum: ['Connection error'] })
  error: 'Connection error';

  @ApiProperty()
  errorMessage: string;
}
