import { FastifyHelmetOptions } from '@fastify/helmet';

export function getHelmetOptions(): FastifyHelmetOptions {
  return {
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'no-referrer' },
    xssFilter: true,
  };
}
