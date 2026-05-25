import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * Mock Cache Manager for testing
 */
export const mockCacheManager: Partial<Cache> = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  reset: jest.fn(),
  wrap: jest.fn(),
  store: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    reset: jest.fn(),
    mget: jest.fn(),
    mset: jest.fn(),
    mdel: jest.fn(),
    keys: jest.fn(),
    ttl: jest.fn(),
  } as any,
};

/**
 * Provider for mock Cache Manager
 */
export const MockCacheManagerProvider = {
  provide: CACHE_MANAGER,
  useValue: mockCacheManager,
};

/**
 * Reset all cache manager mocks
 */
export function resetCacheMocks(): void {
  jest.clearAllMocks();
}
