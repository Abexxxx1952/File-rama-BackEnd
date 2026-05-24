import { Type } from 'class-transformer';
import { IsArray } from 'class-validator';
import { UpdateBaseDto } from './update-base.dto';
import { UpdateFileDto } from './update-file.dto';
import { UpdateFolderDto } from './update-folder.dto';

export class UpdateManyDto {
  @IsArray()
  @Type(() => UpdateBaseDto, {
    discriminator: {
      property: 'fileId',
      subTypes: [
        { value: UpdateFileDto, name: 'file' },
        { value: UpdateFolderDto, name: 'folder' },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  readonly updateMany: (UpdateFileDto | UpdateFolderDto)[];
}
