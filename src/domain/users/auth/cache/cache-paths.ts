import { CACHE_INVALIDATE_KEY_FLAG } from '@/common/interceptors/cache.interceptor';

export const USER_CHANGE_CACHE_INVALIDATE_PATHS = [
  '/api/v1/users' + CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS,
];
