import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteFileDto {
  @IsString()
  @IsNotEmpty()
  readonly clientEmail: string;

  @IsString()
  @IsNotEmpty()
  readonly privateKey: string;

  @IsString()
  @IsNotEmpty()
  readonly fileId: string;
}
