import { IsArray, IsNotEmpty } from 'class-validator';
import { UpdateFileDto } from './update-file.dto';
import { UpdateFolderDto } from './update-folder.dto';

export class UpdateManyDto {
  @IsArray()
  @IsNotEmpty()
  readonly updateMany: (UpdateFileDto | UpdateFolderDto)[];
}
