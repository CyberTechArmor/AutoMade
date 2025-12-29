import { beforeAll, afterAll } from 'vitest';

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/automade_test';
  process.env.JWT_SECRET = 'test-secret-min-32-characters-long';
  process.env.JWT_ISSUER = 'automade-test';
  process.env.REDIS_URL = 'redis://localhost:6379';
});

afterAll(async () => {
  // Cleanup after tests
});
