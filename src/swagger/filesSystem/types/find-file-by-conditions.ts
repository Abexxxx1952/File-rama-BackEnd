import { ApiPropertyOptional } from '@nestjs/swagger';
import { FindFilesByConditionsDto } from '@/domain/filesSystem/dto/find-public-file-by-conditions.dto';

export class FindFileByConditionsArgs implements FindFilesByConditionsDto {
  @ApiPropertyOptional({ type: 'string', format: 'UUID' })
  readonly id?: string;

  @ApiPropertyOptional({ type: 'string', format: 'UUID' })
  readonly userId?: string;

  @ApiPropertyOptional()
  readonly fileUrl?: string;

  @ApiPropertyOptional()
  readonly fileDownloadUrl?: string;

  @ApiPropertyOptional()
  readonly fileName?: string;

  @ApiPropertyOptional()
  readonly fileExtension?: string;

  @ApiPropertyOptional()
  readonly fileSize?: string;

  @ApiPropertyOptional({ type: 'string', format: 'UUID' })
  readonly parentFolderId?: string;

  @ApiPropertyOptional()
  readonly fileGoogleDriveId: string;

  @ApiPropertyOptional()
  readonly fileGoogleDriveParentFolderId: string;

  @ApiPropertyOptional()
  readonly fileGoogleDriveClientEmail: string;

  @ApiPropertyOptional({ type: () => Date })
  readonly uploadDate?: Date;

  @ApiPropertyOptional()
  readonly fileDescription?: string;
}
