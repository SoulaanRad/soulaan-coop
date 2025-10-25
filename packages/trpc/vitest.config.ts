import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    // Prevent hanging in CI/CD
    watch: false,
    // Increase timeout for AI agent calls
    testTimeout: 60000, // 60 seconds
    hookTimeout: 60000, // 60 seconds
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts']
    },
    server: {
      deps: {
        inline: [
          '@openai/agents',
          '@sashimo/lib'
        ]
      }
    }
  }
});