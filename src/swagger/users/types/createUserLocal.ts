import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateUserLocalDto } from '../../../domain/users/dto/createLocal.dto';

export class CreateUserLocalArgs implements CreateUserLocalDto {
  @ApiPropertyOptional()
  readonly name?: string;

  @ApiProperty({ type: 'string', format: 'email' })
  readonly email: string;

  @ApiProperty()
  readonly password: string;

  @ApiPropertyOptional()
  readonly icon?: string;
}
