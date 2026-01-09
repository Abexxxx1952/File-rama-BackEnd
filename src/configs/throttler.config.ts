import { ConfigService } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const getThrottlerConfig = (
  configService: ConfigService,
): ThrottlerModuleOptions => {
  const mode = configService.getOrThrow<string>('MODE');
  const ttl = configService.getOrThrow<number>('THROTTLER_TTL');
  const limit = configService.getOrThrow<number>('THROTTLER_LIMIT');
  const skipIf = mode === 'production' ? () => false : () => true;
  return [
    {
      ttl,
      limit,
      skipIf,
    },
  ];
};
