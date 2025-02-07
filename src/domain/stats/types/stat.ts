import { UUID } from 'crypto';
import { InferSelectModel } from 'drizzle-orm';
import { statsSchema } from '../schema/stats.schema';
import { DriveInfoResult } from './driveInfoResult';

type StatInferSelect = InferSelectModel<typeof statsSchema>;

export class Stat implements StatInferSelect {
  id: UUID;
  userId: UUID;
  fileCount: number;
  folderCount: number;
  totalSize: number;
  usedSize: number;
  driveInfoResult: DriveInfoResult[];
}
