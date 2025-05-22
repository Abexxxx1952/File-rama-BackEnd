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
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const CACHE_OPTION_KEY = 'cache_option';

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
};

export const CacheOptionInvalidateCache = (option: MetadataCacheOptions) => {
  return SetMetadata(CACHE_OPTION_KEY, option);
};

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private cacheOption: MetadataCacheOptions = {
    cache: CacheOptions.Cache,
  };

  constructor(
    private readonly reflector: Reflector,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const fromReflector = this.reflector.getAllAndOverride(CACHE_OPTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (fromReflector) {
      this.cacheOption = fromReflector;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (this.cacheOption.cache === CacheOptions.InvalidateAllCache) {
      return next.handle().pipe(
        tap({
          next: async () => {
            await this.cacheManager.reset();
          },
          error: async () => {
            await this.cacheManager.reset();
          },
        }),
      );
    }
    if (this.cacheOption.cache === CacheOptions.InvalidateCacheByKey) {
      return next.handle().pipe(
        tap({
          next: async () => {
            await this.invalidateCacheStartingWith(
              this.cacheOption.cacheKey,
              userId,
            );
          },
          error: async () => {
            await this.invalidateCacheStartingWith(
              this.cacheOption.cacheKey,
              userId,
            );
          },
        }),
      );
    }
    if (
      this.cacheOption.cache === CacheOptions.Cache ||
      this.cacheOption.cache === true
    ) {
      const request = context.switchToHttp().getRequest();
      const cacheKey = this.getCacheKey(request, userId);

      return new Observable((observer) => {
        this.cacheManager
          .get(cacheKey)
          .then((result) => {
            if (result) {
              observer.next(result);
              observer.complete();
            } else {
              next
                .handle()
                .pipe(
                  tap((data) => {
                    if (
                      data !== undefined &&
                      !context.switchToHttp().getResponse().headersSent
                    ) {
                      this.cacheManager.set(cacheKey, data);
                    }
                  }),
                )
                .subscribe({
                  next: (data) => observer.next(data),
                  error: (err) => observer.error(err),
                  complete: () => observer.complete(),
                });
            }
          })
          .catch((error) => observer.error(error));
      });
    }
  }

  private getCacheKey(request: any, userId?: string): string {
    let cacheKey = request.url;

    if (userId) {
      cacheKey += `_user_${userId}`;
    }

    const query = JSON.stringify(request.query);

    const body = JSON.stringify(request.body);

    const params = JSON.stringify(request.params);

    if (query !== '{}' && query !== undefined) cacheKey += `_${query}`;

    if (body !== '{}' && body !== undefined) cacheKey += `_${body}`;

    if (params !== '{}' && params !== undefined) cacheKey += `_${params}`;

    return cacheKey;
  }
  private async invalidateCacheStartingWith(
    paths: string[] = [],
    userId?: string,
  ): Promise<void> {
    const keys = await this.cacheManager.store.keys();
    console.log('keys', keys);

    let specificPath: string;
    for (const key of keys) {
      for (const path of paths) {
        specificPath = path;
        if (path.endsWith('*')) {
          specificPath = path.slice(0, -1);
        }
        if (userId && !path.endsWith('*')) {
          specificPath = `${path}_user_${userId}`;
        }

        if (key.startsWith(specificPath)) {
          await this.cacheManager.del(key);
        }
      }
    }
  }
}
