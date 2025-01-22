import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { UpdateFileDto } from '@/domain/filesSystem/dto/update-file.dto';

export class UpdateFileArgs implements UpdateFileDto {
  @ApiPropertyOptional()
  readonly fileName?: string;

  @ApiPropertyOptional()
  readonly fileExtension?: string;

  @ApiPropertyOptional({ type: 'string', format: 'UUID' })
  readonly parentFolderId?: UUID;

  @ApiPropertyOptional()
  readonly fileDescription?: string;
}
