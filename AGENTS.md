# AGENTS.md

This file provides repository guidance to coding agents working in this project.

## Project Overview

NestJS 12 ESM TypeScript service template using pnpm 11.1.2 on Node.js 24. Reusable runtime facilities for configuration, validation, persistence, security, caching, queues, scheduling, HTTP clients and observability, with current identity and assistant business modules. Requires MySQL 8 and Redis 7.

## Dependency Versions

All direct dependency versions live in the default `catalog` in
`pnpm-workspace.yaml`. Keep `package.json` dependency entries on `catalog:`;
add or upgrade a package by editing the catalog, then regenerate
`pnpm-lock.yaml`. `catalogMode: strict` keeps pnpm additions aligned with it.

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
pnpm run lint               # oxlint type-aware checks
pnpm run lint:check         # oxlint type-aware CI gate
pnpm run format             # Prettier on source, config, scripts, and docs
pnpm run test               # unit tests (NODE_ENV=test)
pnpm exec vitest run path/to/file.spec.ts  # focused unit test
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

<!-- AI modified: the confirmed modules/infra/common boundaries replace the old flat capability and central-type layout. -->

- `src/bootstrap/`: order-sensitive startup, HTTP registration and shutdown. No business logic.
- `src/config/`: configuration values, enums, local types and validation. No runtime adapters.
- `src/common/`: small HTTP protocols/metadata and shared input constraints. No infrastructure or business dependencies.
- `src/infra/`: complete non-business runtime facilities, including database/migrations, auth mechanisms, HTTP response pipeline, i18n, health, cache, queues, scheduling, cryptography, CSRF, throttling, logging and Sentry.
- `src/modules/<business>/`: controllers, services, DTOs, local types, data access and colocated tests. Current identity and assistant modules are composed in `src/modules/application.module.ts`.

Dependency direction: modules -> infra/common/config; infra -> common/config/other infra; common -> common only; config -> config only. Bootstrap consumes infra/common/config, and AppModule is the sole root. Circular source dependencies are forbidden. Another business's private implementation or tables must not be accessed; use its declared public service/contract and import its owning Nest module. Do not re-register another module's provider.

Small modules stay flat; create subdirectories only for actual responsibilities. Types remain with their owner, including private types in one implementation file. Stable shared protocols may live in common. No central `src/types`, runnable Demo catalog, global type barrel, or unnecessary Repository forwarding layer. Global registration does not change ownership.

Capability modules are not `@Global()`. `ConfigModule.forRoot({ isGlobal: true })` is the deliberate config exception. TypeORM root is registered once in AppModule; entity owners use `forFeature` locally. APP_GUARD/FILTER/INTERCEPTOR providers stay in their owning explicitly imported infrastructure module.

`instrument.ts` is imported first from main. Preserve middleware ordering, language negotiation, native probe/SSE/file boundaries, graceful shutdown and same-origin browser cookie/CSRF behavior.

Identity owns accounts, sessions and invitations. HTTP session/admin checks belong to identity guards; services receive checked user IDs. Assistant keeps conversations, durable generation transitions, personal-model configuration, provider protocols and scheduled catalog synchronization distinct. API and workers stay in one process by default.

All application migrations are in `src/infra/database/migrations/`; source and compiled CLI/runtime discovery differ only by extension. Preserve production migration names/history and never reset a production database. Existing Demo tables/history are not dropped by source removal.

Read `docs/architecture.md`, and the relevant configuration/database/security/OpenAPI guide before changing their boundary. Run `test:architecture` and `verify:architecture` after compilation when changing ownership. The checker resolves TypeScript aliases and erased type imports as well as runtime edges.

Unit tests are colocated; E2E tests are in `test/e2e`, guarded real-infrastructure tests in `test/integration`. Local imports use `.js` extensions with NodeNext ESM. Use `Relation<T>` for future TypeORM relations to avoid circular decorator metadata.

## Coding Style

- NestJS dependency injection. Explicit public method return types. Strict typing, avoid `any`.
- Import order: NestJS, third-party, then internal.
- Prettier: single quotes, trailing commas. `module` / `moduleResolution`: `nodenext`.
- Files: kebab-case (`user-management.service.ts`), classes: PascalCase, variables/functions: camelCase.
- Application HTTP JSON field names use camelCase. Map database or third-party field names explicitly where they enter an endpoint response; do not add blanket key conversion to response middleware or require the frontend client to rewrite keys. Preserve externally defined string values and raw pass-through contracts.
- Boolean variables start with `is`, `has`, `can`, `should`. Arrays use plural names.
- No `console.log`; use NestJS Logger. No `I*`/`T*` prefixes on types.
- Prefer existing dependencies and platform APIs before adding new packages.

The `v11` branch remains the NestJS 11 line. This `master` line uses NestJS 12, ESM, and Vitest; shared fixes should be cherry-picked selectively. Never reset the production database to rebuild the scaffold.

## Verification & Safety

- Verify changes with the applicable type checks, lint checks, tests, and build.
- Tag conclusions as `Executed`, `Inspected`, or `Assumed` when reporting.
- Do not disable lint rules or ignore TypeScript errors.
- Require confirmation before: database schema changes, production data modifications, public API changes, auth/authz changes, large cross-module refactors, or irreversible operations.
- Do not commit secrets. Production schema changes must use migrations, not `DB_SYNCHRONIZE=true`.
