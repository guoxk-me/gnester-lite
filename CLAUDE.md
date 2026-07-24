# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS 11 TypeScript service template using pnpm 11.1.2 on Node.js 24. Production-oriented examples for configuration, validation, database, auth, security, caching, queues, scheduling, HTTP clients, file uploads, SSE, WebSocket, and serialization. Requires MySQL 8 and Redis 7.

## Commands

```bash
pnpm install                # install dependencies
pnpm run start:dev          # development watch mode (NODE_ENV=development)
pnpm run start:debug        # watch mode with debugger
pnpm run build              # compile to dist/ and copy config/*.yaml
pnpm run start:prod         # run dist/src/main.js (NODE_ENV=production)
```

**Lint, format, test:**

```bash
pnpm run lint               # ESLint with auto-fix
pnpm run lint:check         # ESLint without writing
pnpm run format             # Prettier on src/, test/, config/
pnpm run test               # unit tests (NODE_ENV=test)
pnpm run test -- path/to/file.spec.ts  # focused unit test
pnpm run test:cov           # coverage
pnpm run test:e2e           # e2e tests
```

**Database migrations:**

```bash
pnpm migration:create <path>
pnpm migration:generate <path>
pnpm migration:run
pnpm migration:revert
```

**CI verification sequence:**

```bash
pnpm run lint:check
pnpm run test
pnpm run build
pnpm run test:e2e
```

## Architecture

### Two-layer module structure

- **`src/common/`** — reusable platform modules (auth, cache, csrf, crypto, health, http-client, logger, queue, rate-limit, schedule, security, sentry, validation, websocket). `@Global()` modules like `CommonCacheModule` export providers without requiring imports in consuming modules. Logging uses `nestjs-pino` (`CommonLoggerModule` + `app.useLogger`).
- **`src/features/`** — demo feature modules (demo-database, demo-auth, demo-queue, demo-upload, etc.). Each contains controller, service, module, spec files, and `dto/` / `entities/` subdirectories.

### Configuration system

Double-validation design in `config/`:
- **YAML defaults** (`config/config.yaml`) → validated by `configuration.ts` using `class-validator` on a typed `YamlVariables` class. Used for non-secret app defaults (cache TTL, queue settings, HTTP client options, rate-limit throttlers).
- **Environment variables** → validated by `config/validation.ts` using `class-validator` on `EnvironmentVariables`. Secrets, DB credentials, Redis URL, CORS settings. Production enforces JWT_SECRET, ENCRYPTION_KEY, HMAC_SECRET, and CSRF_SECRET.

Both run through NestJS `ConfigModule.forRoot({ validate })`, combining YAML defaults with env overrides. Config types live in `config/config.types.ts`.

### Bootstrap

`src/instrument.ts` is imported first for optional Sentry initialization.
`src/main.ts` creates the app, attaches nestjs-pino, delegates the
order-sensitive runtime pipeline to
`src/bootstrap/configure-application.ts`, and starts listening. That shared
bootstrap configures CORS, compression, cookie-parser, express-session
(MemoryStore, dev only), CSRF, global validation, URI versioning, API docs, and
the Socket.IO adapter.

### Test infrastructure

- Nest CLI builds with SWC (`nest-cli.json` `builder: "swc"`, `typeCheck: true`, `filenames: ["src","config"]`, `stripLeadingPaths: false` so `dist/src` + `dist/config` match runtime imports). Jest uses `@swc/jest` with `.swcrc` (`legacyDecorator` + `decoratorMetadata`).
- Jest with `NODE_ENV=test`, `--experimental-vm-modules`.
- Unit tests colocated as `*.spec.ts` (in `src/` and `config/`).
- E2E tests in `test/` using `test/jest-e2e.json`.
- `DemosModule` excludes `DemoQueueModule` in test environments. `CommonQueueModule` keeps BullMQ lazy and manually registered in test mode.
- TypeORM relation fields should use `Relation<T>` to avoid SWC circular-import issues (see `docs/database.md`).

### Key dependencies

BullMQ (queues via `@nestjs/bullmq`), TypeORM + MySQL, Redis (`@keyv/redis` for caching, also backing BullMQ), `@nestjs/event-emitter`, `@nestjs/schedule`, `@nestjs/throttler`, `@nestjs/swagger`, `@nestjs/jwt`, `@nestjs/websockets` + Socket.IO, `@sentry/nestjs`, `class-validator` + `class-transformer` for validation.

## Coding Style

- NestJS dependency injection. Explicit public method return types. Strict typing, avoid `any`.
- Import order: NestJS, third-party, then internal.
- Prettier: single quotes, trailing commas. `module` / `moduleResolution`: `nodenext`.
- Files: kebab-case (`demo-database.service.ts`), classes: PascalCase, variables/functions: camelCase.
- Boolean variables start with `is`, `has`, `can`, `should`. Arrays use plural names.
- No `console.log`; use NestJS Logger. No `I*`/`T*` prefixes on types.
- Prefer existing dependencies and platform APIs before adding new packages.

## Verification & Safety

- Verify changes with type checking, linting, tests, and build.
- Tag conclusions as `Executed`, `Inspected`, or `Assumed` when reporting.
- Do not disable lint rules or ignore TypeScript errors.
- Require confirmation before: database schema changes, production data modifications, public API changes, auth/authz changes, large cross-module refactors, or irreversible operations.
- Do not commit secrets. Production schema changes must use migrations, not `DB_SYNCHRONIZE=true`.
