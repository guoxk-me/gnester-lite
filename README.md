# gnester-lite

> CN: 文档文件，说明 README 的用途；EN: Documentation file explains the purpose of README.

NestJS 11 TypeScript service template with production-oriented examples for
configuration, validation, database access, authentication, authorization,
security middleware, caching, queues, scheduling, HTTP clients, file uploads,
SSE, WebSocket, serialization, Sentry error monitoring, and Pino structured
logging.

## Requirements

- Node.js 24
- pnpm 11.1.2
- MySQL 8
- Redis 7

## Quick Start

```bash
pnpm install
pnpm run start:dev
```

The development server listens on `http://localhost:3000` by default.

API documentation (OpenAPI / AsyncAPI) is available outside production:

```text
http://localhost:3000/docs
http://localhost:3000/docs-json
http://localhost:3000/async-api
```

Architecture documentation (Compodoc) is generated separately from source:

```bash
pnpm run compodoc        # write static docs to documentation/
pnpm run compodoc:serve  # generate and serve at http://localhost:8080
```

OpenAPI describes how to call HTTP APIs. Compodoc describes module/class structure
inside the codebase. They are complementary, not alternatives.

Health checks:

```text
GET /health/live
GET /health/ready
```

## Docker

Run the application with MySQL and Redis:

```bash
docker compose up --build
```

The compose file uses example production values. Replace the JWT, CSRF,
encryption, HMAC, database, and CORS values before using the pattern for a real
deployment.

## Scripts

```bash
pnpm run start:dev      # development watch mode (SWC)
pnpm run build          # compile with SWC + type-check to dist/
pnpm run start:prod     # run dist/src/main.js with NODE_ENV=production
pnpm run lint           # ESLint with auto-fix
pnpm run lint:check     # ESLint without writing changes
pnpm run test           # unit tests (@swc/jest)
pnpm run test:e2e       # e2e tests
pnpm run test:cov       # coverage
pnpm run compodoc       # generate Compodoc architecture docs
pnpm run compodoc:serve # generate and serve Compodoc locally
```

Build and watch use the Nest CLI SWC builder (`nest-cli.json`). SWC compiles both
`src/` and `config/` into `dist/src` and `dist/config` (`stripLeadingPaths:
false`) so baseUrl imports like `config/...` resolve at runtime. Jest transforms
TypeScript with `@swc/jest` and `.swcrc`. SWC does not type-check by itself;
`compilerOptions.typeCheck` runs `tsc --noEmit` alongside the build.

## Database

The template uses MySQL through TypeORM. Runtime configuration lives in
`config/database.config.ts`; the CLI data source is
`config/typeorm.data-source.ts`.

```bash
pnpm migration:create src/migrations/CreateExample
pnpm migration:generate src/migrations/CreateExample
pnpm migration:run
pnpm migration:revert
```

Production schema changes should use migrations, not `DB_SYNCHRONIZE=true`.

## Project Layout

```text
config/              configuration loaders, validation, TypeORM data source
docs/                topic guides for the template examples
src/bootstrap/       order-sensitive application startup composition
src/common/          reusable platform modules and utilities
src/features/        removable demo feature catalog
src/migrations/      TypeORM migrations
test/                e2e tests
```

## Documentation

- Runtime API docs: OpenAPI (`/docs`) and AsyncAPI (`/async-api`) outside production
- Architecture docs: Compodoc via `pnpm run compodoc` / `pnpm run compodoc:serve`
- Topic guides:
  - `docs/project-notes.zh-en.md`
  - `docs/configuration.md`
  - `docs/database.md`
  - `docs/security.md`
  - `docs/queue.md`
  - `docs/schedule.md`
  - `docs/websocket.md`
  - `docs/validation.md`
  - `docs/serialization.md`
  - `docs/sentry.md`
  - `docs/logger.md`
  - `docs/health.md`
  - `docs/cache.md`
  - `docs/openapi.md`
  - `docs/asyncapi.md`
  - `docs/demo.md`

## Verification

Run the same checks as CI:

```bash
pnpm run lint:check
pnpm run test
pnpm run build
pnpm run test:e2e
```
