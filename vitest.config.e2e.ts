import { defineConfig } from 'vitest/config';

export default defineConfig({
  // AI modified: share native tsconfig path resolution with unit tests.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
