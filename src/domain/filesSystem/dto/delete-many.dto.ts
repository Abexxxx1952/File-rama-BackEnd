import { IsArray, IsNotEmpty } from 'class-validator';
import { DeleteFileDto } from './delete-file.dto';
import { DeleteFolderDto } from './delete-folder.dto';

export class DeleteManyDto {
  @IsArray()
  @IsNotEmpty()
  readonly deleteMany: (DeleteFileDto | DeleteFolderDto)[];
}
