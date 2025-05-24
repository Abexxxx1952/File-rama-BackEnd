import { CACHE_INVALIDATE_KEY_FLAG } from '@/common/interceptors/cache.interceptor';

export const USER_CHANGE_CACHE_INVALIDATE_PATHS = [
  '/api/v1/users/findAll' + CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS,
  '/api/v1/users/findWithRelations' +
    CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS_WITH_ID,
  '/api/v1/users/findById/' +
    CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS_ENDING_WITH_ID,
  '/api/v1/stats/userStats',
];
