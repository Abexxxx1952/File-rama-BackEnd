/**
 * Global test setup file
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRATION_TIME = '3600';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Increase test timeout for slower operations
jest.setTimeout(30000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
};

// Global test utilities
beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  // Cleanup after all tests
  await new Promise((resolve) => setTimeout(resolve, 500));
});
