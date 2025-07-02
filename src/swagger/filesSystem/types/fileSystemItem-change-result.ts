import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import {
  ChangeStatus,
  FileChangeResult,
  FolderChangeResult,
} from '@/domain/filesSystem/types/fileSystemItem-change-result';

export class FileChangeResultModel implements FileChangeResult {
  @ApiProperty()
  fileId: UUID;

  @ApiProperty()
  status: ChangeStatus;
}

export class FolderChangeResultModel implements FolderChangeResult {
  @ApiProperty()
  folderId: UUID;

  @ApiProperty()
  status: ChangeStatus;
}
