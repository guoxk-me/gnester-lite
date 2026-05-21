# Repository Guidelines

## Project Structure & Module Organization

This is a NestJS 11 TypeScript service using pnpm. Application code lives in `src/`, with feature modules under `src/features/` such as `demo-config` and `demo-database`. Keep DTOs in `dto/`, TypeORM entities in `entities/`, and services/controllers beside their module file. Configuration code and YAML live in `config/`; builds copy `config/*.yaml` into `dist/config`. TypeORM migrations belong in `src/migrations/`. Unit tests are colocated as `*.spec.ts`; e2e tests live in `test/`.

## Build, Test, and Development Commands

- `pnpm install`: install dependencies with the pinned pnpm version.
- `pnpm run start:dev`: run the app in watch mode with `NODE_ENV=development`.
- `pnpm run build`: compile TypeScript into `dist/` and copy configured assets.
- `pnpm run start:prod`: run the compiled app from `dist/main`.
- `pnpm run lint`: run ESLint with auto-fix across source and tests.
- `pnpm run format`: format TypeScript files with Prettier.
- `pnpm run test`: run unit tests with Jest and `NODE_ENV=test`.
- `pnpm run test:e2e`: run e2e tests using `test/jest-e2e.json`.
- `pnpm run test:cov`: generate coverage in `coverage/`.

## Coding Style & Naming Conventions

Use TypeScript with NestJS dependency injection. Prefer explicit public method return types and avoid `any` unless required. Files use kebab-case (`demo-database.service.ts`), classes use PascalCase, variables and methods use camelCase, and constants use UPPER_SNAKE_CASE. Prettier enforces single quotes and trailing commas. Order imports as NestJS, third-party, then internal. Do not use `console.log`; use NestJS logging or existing error handling.

## Testing Guidelines

Jest with `ts-jest` is the unit test framework. Name unit tests `*.spec.ts` and place them next to the code they cover, or under `config/` for configuration tests. Run focused tests with `pnpm run test -- path/to/file.spec.ts`, then run the full suite before finishing. Add e2e coverage in `test/` when controller behavior or app wiring changes.

## Commit & Pull Request Guidelines

Recent history uses concise Conventional Commit-style subjects, for example `chore: add class validator`. Use imperative subjects such as `feat: add demo database endpoint` or `fix: validate config port`. Pull requests should include a short summary, linked issue when available, migration/config notes, and validation commands run.

## Security & Configuration Tips

Do not commit secrets. Keep environment-specific values in local environment files or deployment settings, and validate shared defaults through `config/validation.ts`. When changing database settings, update related docs in `docs/` and confirm TypeORM commands still point at `config/typeorm.data-source.ts`.
