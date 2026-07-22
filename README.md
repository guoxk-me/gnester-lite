# gnester-lite

> CN: 文档文件，说明 README 的用途；EN: Documentation file explains the purpose of README.

NestJS 11 TypeScript service template with production-oriented examples for
configuration, validation, database access, authentication, authorization,
security middleware, caching, queues, scheduling, HTTP clients, file uploads,
SSE, WebSocket, and serialization.

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

OpenAPI documentation is available outside production:

```text
http://localhost:3000/docs
http://localhost:3000/docs-json
```

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
pnpm run start:dev      # development watch mode
pnpm run build          # compile to dist/
pnpm run start:prod     # run dist/src/main.js with NODE_ENV=production
pnpm run lint           # ESLint with auto-fix
pnpm run lint:check     # ESLint without writing changes
pnpm run test           # unit tests
pnpm run test:e2e       # e2e tests
pnpm run test:cov       # coverage
```

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
src/common/          reusable platform modules and utilities
src/features/        demo feature modules
src/migrations/      TypeORM migrations
test/                e2e tests
```

## Documentation

- `docs/project-notes.zh-en.md`
- `docs/configuration.md`
- `docs/database.md`
- `docs/security.md`
- `docs/queue.md`
- `docs/schedule.md`
- `docs/websocket.md`
- `docs/validation.md`
- `docs/serialization.md`
- `docs/demo.md`

## Verification

Run the same checks as CI:

```bash
pnpm run lint:check
pnpm run test
pnpm run build
pnpm run test:e2e
```
