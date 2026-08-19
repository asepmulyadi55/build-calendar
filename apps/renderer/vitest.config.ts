import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // The memory regression test builds a Docker image and renders an A2 sheet.
    // It is slow by nature; the default 5 s would fail it for the wrong reason.
    testTimeout: 15 * 60 * 1000,
    hookTimeout: 15 * 60 * 1000,
  },
});
