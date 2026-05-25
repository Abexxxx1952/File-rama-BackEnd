import { ModuleMetadata } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

/**
 * Create a testing module with common test configuration
 */
export async function createTestingModule(
  metadata: ModuleMetadata,
): Promise<TestingModule> {
  return await Test.createTestingModule(metadata).compile();
}

/**
 * Wait for a specific amount of time (useful for async operations in tests)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock implementation helper for creating partial mocks
 */
export function createMock<T>(partial: Partial<T> = {}): T {
  return partial as T;
}

/**
 * Deep clone an object (useful for test data isolation)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Generate a random string for testing
 */
export function randomString(length = 10): string {
  return Math.random()
    .toString(36)
    .substring(2, length + 2);
}

/**
 * Generate a random email for testing
 */
export function randomEmail(): string {
  return `test-${randomString()}@example.com`;
}

/**
 * Generate a random UUID v4
 */
export function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;

    return v.toString(16);
  });
}
