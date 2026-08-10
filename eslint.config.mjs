// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'src/metadata.ts'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: 'commonjs',
      parserOptions: {
        // AI modified: lint source and tests against their separate strict TS projects.
        project: ['./tsconfig.build.json', './tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    languageOptions: {
      // AI modified: Jest globals are available only to test files, not production source.
      globals: {
        ...globals.jest,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
);
