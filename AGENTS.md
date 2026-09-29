# AGENTS.md

This file provides repository guidance to coding agents working in this project.

## Project Overview

NestJS 11 TypeScript service template using pnpm 11.1.2 on Node.js 24. Production-oriented examples for configuration, validation, database, auth, security, caching, queues, scheduling, HTTP clients, file uploads, SSE, WebSocket, and serialization. Requires MySQL 8 and Redis 7.

## Dependency Versions

All direct dependency versions live in the default `catalog` in
`pnpm-workspace.yaml`. Keep `package.json` dependency entries on `catalog:`;
add or upgrade a package by editing the catalog, then regenerate
`pnpm-lock.yaml`. `catalogMode: strict` keeps pnpm additions aligned with it.
Security override pins live in the named `security` catalog.

## Commands

```bash
pnpm install                # install dependencies
pnpm run start:dev          # development watch mode (NODE_ENV=development)
pnpm run start:debug        # watch mode with debugger
pnpm run build              # compile to dist/src/ and copy src/config/*.yaml
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

For task-specific verification, use the repository `gnester-verify` skill in
`.agents/skills/gnester-verify/`. The complete CI sequence lives in
`.github/workflows/ci.yml` and should be read when preparing a full CI run.

## Architecture

### Layered ownership

- **`src/bootstrap/`** — order-sensitive process and HTTP composition: startup,
  shutdown, middleware, validation, OpenAPI, and the Socket.IO adapter.
- **Top-level capability folders** — `auth/`, `authorization/`, `better-auth/`,
  `cache/`, `crypto/`, `csrf/`, `health/`, `http-client/`, `i18n/`,
  `logger/`, `queue/`, `rate-limit/`, `schedule/`, and `sentry/`.
  Each owns its Nest module, providers, adapters, and focused tests.
- **`src/<business-name>/`** — future production business capabilities. A
  business folder owns its controllers, services, DTOs, entities, local
  adapters, and tests. There is no `src/features/` wrapper.
- **`src/examples/`** — removable teaching and integration examples. The
  complete Demo catalog is excluded from the production module graph.
- **`src/config/`** — typed YAML defaults, environment validation, and
  TypeORM CLI configuration.
- **`src/database/migrations/`** — production-visible application migrations.
- **`src/contracts/`** — small, stable, framework-free TypeScript contracts.
  Do not place NestJS DTOs or miscellaneous helpers here.

Dependency direction is `bootstrap/business/examples -> capabilities -> contracts`.
Capabilities must not import business folders, examples, or bootstrap;
business folders and bootstrap must not import examples. Do not import another
business folder's private implementation. See `docs/architecture.md`.

For a change to one area, read its focused guide in `docs/` when relevant:
`database.md` for schema or TypeORM work, `configuration.md` for configuration,
`security.md` for security controls, and `openapi.md` for API documentation.

Capability modules are explicit dependencies and must not use `@Global()`.
A consumer that injects a capability provider imports its owning module in
its own `imports` array. `AppModule` is the sole composition root.

Production-visible application migrations belong in `src/database/migrations/`. The
Demo database migration belongs to `src/examples/demo-database/migrations/`
and is discovered only in development, test, and guarded provision—not in
production. Keep its migration class/name stable so existing TypeORM history is
not reinterpreted.

### Configuration system

Double-validation design in `src/config/`:

- **YAML defaults** (`src/config/config.yaml`) → validated by `configuration.ts` using `class-validator` on a typed `YamlVariables` class. Used for non-secret app defaults (cache TTL, queue settings, HTTP client options, rate-limit throttlers).
- **Environment variables** → validated by `src/config/validation.ts` using `class-validator` on `EnvironmentVariables`. Secrets, DB credentials, Redis URL, CORS settings. Production enforces JWT_SECRET, ENCRYPTION_KEY, and HMAC_SECRET; CSRF_SECRET is required when CSRF is enabled.

Both run through NestJS `ConfigModule.forRoot({ validate, isGlobal: true })`,
combining YAML defaults with env overrides. The global `ConfigModule` is a
deliberate composition exception, so capabilities may inject `ConfigService`
without repeated module imports. `TypeOrmModule.forRootAsync(...)` is likewise
registered once in `AppModule`; repository-owning features still declare
`TypeOrmModule.forFeature(...)` locally. Config types live in
`src/config/config.types.ts`.

Framework-wide `APP_GUARD` and `APP_FILTER` providers are allowed only inside
their focused capability modules, which `AppModule` imports explicitly.

### Bootstrap

`src/instrument.ts` is imported first for optional Sentry initialization.
`src/main.ts` creates the app, attaches nestjs-pino, delegates the
order-sensitive runtime pipeline to
`src/bootstrap/configure-application.ts`, and starts listening. That shared
bootstrap configures CORS, compression, cookie-parser, express-session
(MemoryStore, dev only), CSRF, global validation, URI versioning, API docs, and
the Socket.IO adapter.

### Test infrastructure

- Nest CLI builds with SWC (`nest-cli.json` `builder: "swc"`, `typeCheck: true`, `filenames: ["src"]`, `stripLeadingPaths: false` so `dist/src` matches runtime imports). Jest uses `@swc/jest` with `.swcrc` (`legacyDecorator` + `decoratorMetadata`).
- Jest with `NODE_ENV=test`, `--experimental-vm-modules`.
- Unit tests colocated as `*.spec.ts` in `src/`.
- E2E tests in `test/e2e/`, integration tests in `test/integration/`, and fixtures in `test/fixtures/`.
- `DemosModule` excludes `DemoQueueModule` in test environments.
  `DemoQueueModule` explicitly imports `QueueModule`, which keeps BullMQ
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

- Verify changes with the applicable type checks, lint checks, tests, and build.
- Tag conclusions as `Executed`, `Inspected`, or `Assumed` when reporting.
- Do not disable lint rules or ignore TypeScript errors.
- Require confirmation before: database schema changes, production data modifications, public API changes, auth/authz changes, large cross-module refactors, or irreversible operations.
- Do not commit secrets. Production schema changes must use migrations, not `DB_SYNCHRONIZE=true`.
