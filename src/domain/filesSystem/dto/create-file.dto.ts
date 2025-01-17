import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Readable, Stream } from 'stream';
import { IsBufferOrReadable } from '@/common/decorators/IsBufferOrReadable.decorator';
import { NameConflictChoice } from '../types/upload-name-conflict';

export class CreateFileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsEnum(NameConflictChoice)
  readonly conflictChoice?: NameConflictChoice;

  @IsBufferOrReadable()
  readonly fileStream: Readable | Stream | Buffer;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly parentFolder?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly parentFolderGoogleDriveId?: string;
}
