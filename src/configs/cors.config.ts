import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';

export function getCorsOptions(configService: ConfigService): CorsOptions {
  return {
    origin: [
      configService.getOrThrow<string>('CLIENT_DOMAIN_URL') ??
        'http://localhost:3000',
    ],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  };
}
