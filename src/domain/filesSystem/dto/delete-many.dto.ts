import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';
import { UUID } from 'crypto';

class DeleteFileDto {
  @IsUUID()
  @IsNotEmpty()
  readonly fileId: UUID;
}

class DeleteFolderDto {
  @IsUUID()
  @IsNotEmpty()
  readonly folderId: UUID;
}
export class DeleteManyDto {
  @IsArray()
  @IsNotEmpty()
  readonly deleteMany: (DeleteFileDto | DeleteFolderDto)[];
}
