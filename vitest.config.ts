import { defineConfig } from 'vitest/config';

export default defineConfig({
  // AI modified: Vite's native resolver handles NodeNext tsconfig paths without a TypeScript 5-only plugin.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    coverage: {
      // AI modified: include untested production files so the coverage gate cannot improve by omitting them.
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
      thresholds: {
        branches: 40,
        functions: 70,
        lines: 75,
        statements: 70,
        // AI modified: retain focused gates; Vitest counts validation-pipe branches differently from Jest.
        'src/bootstrap/http/validation.pipe.ts': {
          branches: 60,
          functions: 100,
          lines: 90,
          statements: 90,
        },
        'src/i18n/api-envelope.interceptor.ts': {
          branches: 50,
          functions: 100,
          lines: 85,
          statements: 85,
        },
        'src/i18n/api-exception.filter.ts': {
          branches: 60,
          functions: 90,
          lines: 80,
          statements: 80,
        },
        'src/i18n/i18n.translate.ts': {
          branches: 60,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
  },
});
