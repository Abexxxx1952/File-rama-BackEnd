import { ApiProperty } from '@nestjs/swagger';
import { relationsUserDto } from '@/domain/users/dto/relations.dto';

export class RelationsUserArgs implements relationsUserDto {
  @ApiProperty({
    type: [String],
    example: ['files', 'folders'],
  })
  readonly relations: string[];
}
