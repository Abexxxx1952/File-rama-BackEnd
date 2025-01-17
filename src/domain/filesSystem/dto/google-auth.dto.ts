import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  readonly clientEmail: string;

  @IsString()
  @IsNotEmpty()
  readonly privateKey: string;
}
