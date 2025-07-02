import { UpdateFileDto } from './update-file.dto';
import { UpdateFolderDto } from './update-folder.dto';

export type UpdateManyDto = UpdateFileDto | UpdateFolderDto;
