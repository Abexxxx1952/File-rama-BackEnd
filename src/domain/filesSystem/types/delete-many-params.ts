import { UUID } from 'crypto';

export type DeleteMany = (
  | { fileId: UUID }
  | {
      folderId: UUID;
    }
)[];
