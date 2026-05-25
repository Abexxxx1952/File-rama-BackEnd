import { PgliteDatabase } from 'drizzle-orm/pglite';
import { DatabaseSchema } from '@/database/schema-loader';

/**
 * Mock database for unit tests
 * Returns a mock object that can be used in unit tests without actual database connection
 */
export function createMockDatabase(): Partial<PgliteDatabase<DatabaseSchema>> {
  return {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    execute: jest.fn(),
    transaction: jest.fn(),
  } as any;
}

/**
 * Reset all database mocks
 */
export function resetDatabaseMocks(db: any): void {
  Object.values(db).forEach((fn: any) => {
    if (typeof fn === 'function' && fn.mockReset) {
      fn.mockReset();
    }
  });
}
