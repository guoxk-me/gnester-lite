import { defineConfig } from 'vitest/config';

export default defineConfig({
  // AI modified: Vite's native resolver handles NodeNext tsconfig paths without a TypeScript 5-only plugin.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
});
