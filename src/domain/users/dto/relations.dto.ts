import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class relationsUserDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  readonly relations: string[];
}
