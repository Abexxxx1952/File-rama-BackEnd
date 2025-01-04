import { IsString } from 'class-validator';

export class Payloads {
  @IsString()
  key: string;
  @IsString()
  value: string;
}
