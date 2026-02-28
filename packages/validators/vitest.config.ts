import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    // Increase timeout for AI agent calls
    testTimeout: 60000, // 60 seconds
    hookTimeout: 60000, // 60 seconds
    teardownTimeout: 5000,
    pool: 'threads',
    singleThread: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts']
    }
  }
});