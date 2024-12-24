import { IsString } from 'class-validator';

export class Payload {
  @IsString()
  key: string;
  @IsString()
  value: string;
}
