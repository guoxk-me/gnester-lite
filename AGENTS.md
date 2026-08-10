# AGENTS.md

This file provides repository guidance to coding agents working in this project.

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
pnpm run format             # Prettier on source, config, scripts, and docs
pnpm run test               # unit tests (NODE_ENV=test)
pnpm run test -- path/to/file.spec.ts  # focused unit test
pnpm run test:cov           # coverage
pnpm run test:e2e           # e2e tests
pnpm run typecheck          # strict production and test TypeScript checks
pnpm run peers:check        # peer dependency compatibility
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
pnpm install --frozen-lockfile
pnpm run verify:container-references
pnpm run peers:check
pnpm run format:check
pnpm run lint:check
pnpm run typecheck
pnpm run test:cov
pnpm run test:integration-policy
pnpm run build
pnpm run verify:architecture
pnpm run verify:artifact
pnpm run verify:openapi
pnpm run compodoc
pnpm run verify:shutdown-contract
docker compose config --quiet
docker build --tag gnester-lite:ci .
pnpm run verify:docker-image
pnpm run test:e2e
pnpm run verify:migrations
pnpm run test:full-app
pnpm run verify:production-start
pnpm run audit:prod
```

## Architecture

### Layered ownership

- **`src/bootstrap/`** — order-sensitive process and HTTP composition: startup,
  shutdown, middleware, validation, OpenAPI, and the Socket.IO adapter.
- **`src/platform/infrastructure/`** — cache, outbound HTTP, and queue
  integrations.
- **`src/platform/runtime/`** — managed runtime capabilities such as
  scheduling.
- **`src/platform/observability/`** — Pino logging and Sentry integration.
- **`src/platform/operations/`** — health, readiness, and operator-facing
  capabilities.
- **`src/platform/security/`** — auth, authorization, crypto, CSRF, and rate
  limiting.
- **`src/features/`** — supported production business capabilities. A feature
  owns its controllers, services, DTOs, entities, feature-only migrations,
  local adapters, and tests.
- **`src/examples/`** — removable teaching and integration examples. The
  complete Demo catalog is excluded from the production module graph.
- **`src/contracts/`** — small, stable, framework-free TypeScript contracts.
  Do not place NestJS DTOs or miscellaneous helpers here.

Dependency direction is `bootstrap/features/examples -> platform -> contracts`.
`platform` must not import `features`, `examples`, or `bootstrap`; production
features and bootstrap must not import examples. `contracts` must not import
NestJS, platform, bootstrap, features, or examples. Do not import another
feature's private implementation. See `docs/architecture.md` for the complete
rules.

Platform modules are explicit dependencies and must not use `@Global()`. A
consumer that injects a platform provider imports the owning module in its own
`imports` array. `AppModule` is the sole application composition root.

Production-visible application migrations belong in `src/migrations/`. The
Demo database migration belongs to `src/examples/demo-database/migrations/`
and is discovered only in development, test, and guarded provision—not in
production. Keep its migration class/name stable so existing TypeORM history is
not reinterpreted.

### Configuration system

Double-validation design in `config/`:

- **YAML defaults** (`config/config.yaml`) → validated by `configuration.ts` using `class-validator` on a typed `YamlVariables` class. Used for non-secret app defaults (cache TTL, queue settings, HTTP client options, rate-limit throttlers).
- **Environment variables** → validated by `config/validation.ts` using `class-validator` on `EnvironmentVariables`. Secrets, DB credentials, Redis URL, CORS settings. Production enforces JWT_SECRET, ENCRYPTION_KEY, and HMAC_SECRET; CSRF_SECRET is required when CSRF is enabled.

Both run through NestJS `ConfigModule.forRoot({ validate, isGlobal: true })`,
combining YAML defaults with env overrides. The global `ConfigModule` is a
deliberate composition exception, so capabilities may inject `ConfigService`
without repeated module imports. `TypeOrmModule.forRootAsync(...)` is likewise
registered once in `AppModule`; repository-owning features still declare
`TypeOrmModule.forFeature(...)` locally. Config types live in
`config/config.types.ts`.

Framework-wide `APP_GUARD` and `APP_FILTER` providers are allowed only inside
their focused platform modules, which `AppModule` imports explicitly.

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
- `DemosModule` excludes `DemoQueueModule` in test environments.
  `DemoQueueModule` explicitly imports `CommonQueueModule`, which keeps BullMQ
  lazy and manually registered in test mode.
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
