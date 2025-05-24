import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Cache } from 'cache-manager';
import { FastifyRequest } from 'fastify';
import { from, Observable, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

export const CACHE_INVALIDATE_KEY_FLAG = {
  ALL_PATHS: '(allPath*)',
  ALL_PATHS_WITH_ID: '(allPathWithId*)',
  ALL_PATHS_ENDING_WITH_ID: '(allPathEndingWithId*)',
};
const CACHE_OPTION_KEY = 'cache_option';
const DEFAULT_TTL = 1000 * 60 * 10; // 10 minutes

export enum CacheOptions {
  Cache = 'Cache',
  InvalidateAllCache = 'InvalidateAllCache',
  InvalidateCacheByKey = 'InvalidateCacheByKey',
}

type MetadataCacheOptions = {
  cache: CacheOptions | boolean;
  cacheKey?: CacheOptions.InvalidateCacheByKey extends typeof CacheOptions
    ? never
    : string[];
  ttl?: number;
};

export const CacheOptionInvalidateCache = (option: MetadataCacheOptions) => {
  return SetMetadata(CACHE_OPTION_KEY, option);
};

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private defaultCacheOptions: MetadataCacheOptions = {
    cache: CacheOptions.Cache,
    ttl: DEFAULT_TTL,
  };

  constructor(
    private readonly reflector: Reflector,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const cacheOption = this.getCacheOptions(context);

    const request = context.switchToHttp().getRequest<FastifyRequest>();

    if (cacheOption.cache === CacheOptions.InvalidateAllCache) {
      return this.handleInvalidateAll(next);
    }
    if (cacheOption.cache === CacheOptions.InvalidateCacheByKey) {
      return this.handleInvalidateByKey(next, request, cacheOption);
    }
    if (
      cacheOption.cache === CacheOptions.Cache ||
      cacheOption.cache === true
    ) {
      return this.handleCaching(context, next, request, cacheOption);
    }
    return next.handle();
  }

  private getCacheOptions(context: ExecutionContext): MetadataCacheOptions {
    return {
      ...this.defaultCacheOptions,
      ...this.reflector.getAllAndOverride(CACHE_OPTION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]),
    };
  }

  private handleInvalidateAll(next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap({
        next: () => this.cacheManager.reset(),
        error: () => this.cacheManager.reset(),
      }),
    );
  }

  private handleInvalidateByKey(
    next: CallHandler,
    request: FastifyRequest,
    options: MetadataCacheOptions,
  ): Observable<any> {
    const userId = request.user?.id;

    return next.handle().pipe(
      tap({
        next: () => this.invalidateCache(options.cacheKey, userId),
        error: () => this.invalidateCache(options.cacheKey, userId),
      }),
    );
  }

  private handleCaching(
    context: ExecutionContext,
    next: CallHandler,
    request: FastifyRequest,
    options: MetadataCacheOptions,
  ): Observable<any> {
    const cacheKey = this.generateCacheKey(request);
    const response = context.switchToHttp().getResponse();

    return from(this.cacheManager.get(cacheKey)).pipe(
      switchMap((cachedResponse) => {
        if (cachedResponse) return of(cachedResponse);

        return next.handle().pipe(
          tap(async (data) => {
            if (data !== undefined && !response.headersSent) {
              await this.cacheManager.set(cacheKey, data, options.ttl);
            }
          }),
        );
      }),
    );
  }

  private generateCacheKey(request: FastifyRequest): string {
    const userId = request.user?.id;
    const { url, query, params, body } = request;
    const parts = [
      url,
      userId ? `user_${userId}` : '',
      this.safeStringify(query),
      this.safeStringify(params),
    ];

    return parts.filter(Boolean).join('_');
  }

  private safeStringify(obj: unknown): string {
    try {
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const keys = Object.keys(obj);
        if (keys.length === 0) return '';
        return JSON.stringify(obj, keys.sort());
      }
      return obj !== undefined ? JSON.stringify(obj) : '';
    } catch (error) {
      throw error;
    }
  }

  private async invalidateCache(
    paths: string[] = [],
    userId?: string,
  ): Promise<void> {
    if (!paths.length) return;

    try {
      const keys = (await this.cacheManager.store.keys()) || [];

      const patterns = paths.flatMap((path) => {
        if (path.endsWith(CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS)) {
          return path.slice(0, -CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS.length); //  for invalidate all cache start with this path (public routes)
        }
        if (path.endsWith(CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS_WITH_ID)) {
          const basePath = path.slice(
            0,
            -CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS_WITH_ID.length,
          );

          return keys.filter(
            (key) =>
              key.startsWith(basePath) &&
              (userId ? key.includes(`_user_${userId}`) : true),
          ); //  for invalidate all cache start with this path and include id (private routes or public routes)
        }

        if (path.endsWith(CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS_ENDING_WITH_ID)) {
          return (
            path.slice(
              0,
              -CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS_ENDING_WITH_ID.length,
            ) + (userId ? `${userId}` : '')
          ); //  for invalidate cache invalidate cache ending with id (public routes)
        }

        return userId ? `${path}_user_${userId}` : path; // "user_" for invalidate cache fot uniq user (private routes)
      });

      await Promise.all(
        keys
          .filter((key) => patterns.some((pattern) => key.startsWith(pattern)))
          .map((key) => this.cacheManager.del(key)),
      );
    } catch (error) {
      console.error('Cache invalidation failed:', error);
      throw error;
    }
  }
}
