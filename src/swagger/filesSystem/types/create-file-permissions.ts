import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import {
  CreateFilePermissionsDto,
  UpdateRole,
} from '@/domain/filesSystem/dto/create-file-permissions';

export class CreateFilePermissionsArgs implements CreateFilePermissionsDto {
  @ApiProperty({ type: 'string', format: 'UUID' })
  readonly fileId: UUID;

  @ApiProperty({ enum: UpdateRole })
  readonly role: UpdateRole;
}
