import { defineConfig } from 'vitest/config';

export default defineConfig({
  // AI modified: the guarded full-app suite runs separately from unit and HTTP e2e tests.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.integration-spec.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
