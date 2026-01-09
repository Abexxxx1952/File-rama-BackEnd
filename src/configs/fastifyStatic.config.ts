import type { FastifyStaticOptions } from '@fastify/static';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

export function getFastifyStatic(
  configService: ConfigService,
): FastifyStaticOptions {
  const STATIC_FILES_PUBLIC_DIR = configService.getOrThrow<string>(
    'STATIC_FILES_PUBLIC_DIR',
  );
  return {
    root: join(process.cwd(), STATIC_FILES_PUBLIC_DIR),
    prefix: STATIC_FILES_PUBLIC_DIR,
  };
}
