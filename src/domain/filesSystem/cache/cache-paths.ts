import { CACHE_INVALIDATE_KEY_FLAG } from '@/common/interceptors/cache.interceptor';

export const FILE_CREATE_DELETE_CACHE_INVALIDATE_PATHS = [
  '/api/v1/filesSystem/findAll' + CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS,
  '/api/v1/filesSystem/findFileById/' +
    CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS_ENDING_WITH_ID,
  '/api/v1/stats/userStats',
];

export const FOLDER_CREATE_DELETE_CACHE_INVALIDATE_PATHS = [
  '/api/v1/filesSystem/findAll' + CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS,
  '/api/v1/filesSystem/findFolderById/' +
    CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS_ENDING_WITH_ID,
  '/api/v1/stats/userStats',
];

export const FILE_SYSTEM_ITEM_CHANGE_CACHE_INVALIDATE_PATHS = [
  '/api/v1/filesSystem/findAll' + CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS,
  '/api/v1/filesSystem/findFileById/' +
    CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS_ENDING_WITH_ID,
  '/api/v1/filesSystem/findFolderById/' +
    CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS_ENDING_WITH_ID,
];

export const FILE_CHANGE_CACHE_INVALIDATE_PATHS = [
  '/api/v1/filesSystem/findAll' + CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS,
  '/api/v1/filesSystem/findFileById/' +
    CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS_ENDING_WITH_ID,
];

export const FOLDER_CHANGE_CACHE_INVALIDATE_PATHS = [
  '/api/v1/filesSystem/findAll' + CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS,
  '/api/v1/filesSystem/findFolderById/' +
    CACHE_INVALIDATE_KEY_FLAG.ALL_PATHS_ENDING_WITH_ID,
];
