import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { Stat } from '@/domain/stats/types/stat';
import {
  DriveInfoErrorResultModel,
  DriveInfoSuccessResultModel,
} from './driveInfoResult';

@ApiExtraModels(DriveInfoSuccessResultModel, DriveInfoErrorResultModel)
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

  @ApiProperty({
    type: 'array',
    items: {
      anyOf: [
        { $ref: getSchemaPath(DriveInfoSuccessResultModel) },
        { $ref: getSchemaPath(DriveInfoErrorResultModel) },
      ],
    },
  })
  driveInfoResult: (DriveInfoSuccessResultModel | DriveInfoErrorResultModel)[];
}
