import { CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';

export const getCacheConfig = (
  configService: ConfigService,
): CacheModuleOptions => {
  const ttlProd = configService.getOrThrow<number>('CACHE_TTL');
  const mode = configService.getOrThrow<string>('MODE');
  const ttl = mode === 'production' ? ttlProd : 0;
  return {
    ttl,
  };
};
