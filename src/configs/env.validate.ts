import { plainToClass, Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsNotEmpty()
  MODE: Environment;

  @IsString()
  @IsNotEmpty()
  SERVER_DOMAIN_URL: string;

  @IsString()
  @IsNotEmpty()
  CLIENT_DOMAIN_URL: string;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value))
  PORT: number;

  @IsString()
  @IsNotEmpty()
  PREFIX_URL: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_TYPE: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_HOST: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_NAME: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_USER: string;

  @IsString()
  @IsNotEmpty()
  DB_CONNECTION_STRING: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_TOKEN_SECRET: string;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value))
  JWT_ACCESS_TOKEN_EXPIRATION_TIME: number;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_TOKEN_SECRET: string;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value))
  JWT_REFRESH_TOKEN_EXPIRATION_TIME: number;

  @IsString()
  @IsNotEmpty()
  REFRESH_TOKEN_PATH: string;

  @IsString()
  @IsNotEmpty()
  ACCESS_TOKEN_NAME: string;

  @IsString()
  @IsNotEmpty()
  REFRESH_TOKEN_NAME: string;

  @IsString()
  @IsNotEmpty()
  GOOGLE_OAUTH2_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  GOOGLE_OAUTH2_CLIENT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  GOOGLE_CALLBACK_URL: string;

  @IsString()
  @IsNotEmpty()
  GITHUB_OAUTH2_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  GITHUB_OAUTH2_CLIENT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  GITHUB_CALLBACK_URL: string;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value))
  CACHE_TTL: number;

  @IsString()
  @IsNotEmpty()
  GOOGLE_RECAPTCHA_SECRET_KEY: string;

  @IsString()
  @IsNotEmpty()
  MAIL_LOGIN: string;

  @IsString()
  @IsNotEmpty()
  MAIL_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  MAIL_HOST: string;

  @IsString()
  @IsNotEmpty()
  MAIL_PORT: string;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value))
  MAX_UPLOADS_PER_USER: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
