# gnester-lite

NestJS 11 / TypeScript service template with production-oriented examples for
configuration, validation, MySQL, Better Auth, authentication and authorization, security,
Redis caching, BullMQ, scheduling, outbound HTTP, uploads, SSE, Socket.IO,
serialization, Sentry, and structured Pino logging.

## Requirements

- Node.js 24
- pnpm 11.1.2
- MySQL 8
- Redis 7

## Quick start

```bash
pnpm install
cp .env.example .env.development.local
# Adjust the local MySQL credentials in .env.development.local.
pnpm run migration:run
pnpm run start:dev
```

The development migration command discovers the example-owned Demo database
migration and creates its `demo` table. Demo migrations are opt-in by
environment and are not part of the production migration set.

Runtime environment variables override files. Files are loaded from highest to
lowest priority:

```text
.env.<NODE_ENV>.local
.env.<NODE_ENV>
.env.local
.env
```

`.env.example` is the complete non-secret inventory. Keep real production
secrets in the deployment secret manager, not in committed env files.

The default HTTP server is `http://localhost:3000`. Useful endpoints:

```text
GET /v1
GET /health/live
GET /health/ready
GET /docs              development OpenAPI UI
GET /docs-json         development OpenAPI JSON
GET /async-api         non-production AsyncAPI index
GET /async-api-json
GET /async-api-yaml
POST /api/auth/sign-up/email
POST /api/auth/sign-in/email
GET /api/auth/get-session
POST /api/auth/sign-out
```

OpenAPI describes HTTP contracts, AsyncAPI describes Socket.IO events, and
Compodoc describes code structure:

```bash
pnpm run compodoc
pnpm run compodoc:serve
```

## CSRF-protected requests

Global CSRF middleware protects `POST`, `PUT`, `PATCH`, and `DELETE` while
`CSRF_ENABLED=true`. Preserve both cookies returned by the token endpoint and
send the token header on the mutation. The example uses the default
`x-csrf-token`; if `CSRF_HEADER_NAME` is overridden, use that configured name
instead:

```bash
COOKIE_JAR="$(mktemp)"
TOKEN_RESPONSE="$(curl -fsS -c "$COOKIE_JAR" http://localhost:3000/demo-csrf/token)"
CSRF_TOKEN="$(printf '%s' "$TOKEN_RESPONSE" | node -pe 'JSON.parse(require("node:fs").readFileSync(0, "utf8")).csrfToken')"

curl -fsS -b "$COOKIE_JAR" \
  -H 'content-type: application/json' \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -d '{"recipient":"alice@example.com","amount":25}' \
  http://localhost:3000/demo-csrf/transfer-preview
```

Use this flow for every mutating curl example, including login, queue, schedule,
database, cookie, session, upload, and event routes. A pure bearer-token
deployment may explicitly set `CSRF_ENABLED=false`.

## Docker

Compose requires deployment values instead of embedding example credentials.
Provide these through your shell, CI secret store, or a local ignored env file:

```text
MYSQL_ROOT_PASSWORD
DB_PASSWORD
CORS_ORIGINS
BETTER_AUTH_SECRET
BETTER_AUTH_URL
JWT_SECRET
CSRF_SECRET
ENCRYPTION_KEY
HMAC_SECRET
```

Then run:

```bash
docker compose --env-file .env.production.local up --build
```

MySQL and Redis are private Compose services; only application port `3000` is
published. Compose waits for MySQL, runs the compiled TypeORM migrations in the
one-shot `migrate` service, and starts `app` only after migration success. The
production data source does not discover example-owned Demo migrations, so a
new production database does not receive the `demo` table. The production image
runs as the non-root `node` user. Its container healthcheck calls
`/health/ready` with Node's built-in `fetch`. External container references
retain readable tags and append immutable multi-platform digests; update both
together and run `pnpm run verify:container-references`.

Production checklist:

- Generate independent high-entropy Better Auth, JWT, CSRF, HMAC, database, and root
  credentials; `ENCRYPTION_KEY` must be a base64url-encoded 32-byte key.
- Set explicit trusted `CORS_ORIGINS`; do not use wildcard credentialed CORS.
- Keep `DB_SYNCHRONIZE=false` and deploy schema changes through migrations.
- Keep `SESSION_ENABLED=false` until an external production session store is
  configured.
- Terminate TLS and keep production cookies secure. `SameSite=none` requires
  the corresponding secure-cookie setting.
- Configure `SENTRY_DSN` only when telemetry should leave the environment.

Compose passes application secrets as environment variables, so principals with
Docker inspect access can read them. This template does not implement `*_FILE`
secret loading. For stronger production isolation, add one centralized
file-backed secret provider and use orchestrator-managed secret mounts; do not
duplicate ad hoc file reads across modules.

## Scripts

```bash
pnpm run start:dev          # development watch mode
pnpm run build              # type-check and compile src/config into dist
pnpm run start:prod         # run dist/src/main.js
pnpm run typecheck          # strict production and test TypeScript checks
pnpm run typecheck:build    # production-only TypeScript boundary
pnpm run typecheck:test     # unit/e2e/integration test TypeScript boundary
pnpm run peers:check        # fail on incompatible dependency peers
pnpm run format             # format source, config, scripts, docs, and prompts
pnpm run format:check       # formatting gate without writes
pnpm run lint:check         # strict ESLint gate
pnpm run test               # unit tests
pnpm run test:cov           # unit tests with enforced coverage floor
pnpm run test:debug         # run Jest in the Node debugger
pnpm run test:e2e           # focused HTTP/WebSocket e2e tests
pnpm run test:full-app      # destructive AppModule infrastructure integration
pnpm run test:integration-policy # destructive-script safety contract
pnpm run verify:artifact    # reject specs/maps or missing runtime files in dist
pnpm run verify:container-references # reject mutable external container images
pnpm run verify:openapi     # validate compiled OpenAPI auth/request contracts
pnpm run verify:shutdown-contract # keep application and supervisor shutdown budgets aligned
pnpm run verify:docker-image # inspect the already-built production image
pnpm run verify:migrations  # destructive compiled migration up/down/up round trip
pnpm run verify:production-start # start/probe/terminate the compiled production entry
pnpm run compodoc           # generate and validate code-structure documentation
pnpm run audit:prod         # production dependency vulnerability audit
```

The Nest CLI uses SWC with TypeScript checking. The Swagger SWC plugin generates
`src/metadata.ts` during builds and compiles it to `dist/src/metadata.js`;
generated source metadata is ignored by git.

## Better Auth

Better Auth 1.6 is mounted at the unversioned `/api/auth/*` boundary with email
and password authentication enabled. It stores users, credential accounts, and
opaque cookie sessions in MySQL. Apply migrations before using these endpoints.

Local development uses the clone-ready URL in `.env.example`. Production
requires an independent `BETTER_AUTH_SECRET` of at least 32 bytes and the public
`BETTER_AUTH_URL`; all production URLs and trusted origins must use HTTPS and
must not be loopback origins. `BETTER_AUTH_TRUSTED_ORIGINS` is explicit when
set, otherwise enabled credentialed CORS origins are reused.

Minimal cookie-session flow:

```bash
AUTH_ORIGIN=http://localhost:3000
COOKIE_JAR="$(mktemp)"

curl -fsS -c "$COOKIE_JAR" \
  -H "Origin: $AUTH_ORIGIN" \
  -H 'content-type: application/json' \
  -d '{"name":"Alice","email":"alice@example.com","password":"correct-horse-battery-staple"}' \
  "$AUTH_ORIGIN/api/auth/sign-up/email"

curl -fsS -b "$COOKIE_JAR" \
  -H "Origin: $AUTH_ORIGIN" \
  "$AUTH_ORIGIN/api/auth/get-session"

curl -fsS -b "$COOKIE_JAR" \
  -H "Origin: $AUTH_ORIGIN" \
  -H 'content-type: application/json' \
  -d '{}' \
  "$AUTH_ORIGIN/api/auth/sign-out"
```

The Better Auth handler owns origin/CSRF validation for this exact path and
receives the raw request stream before any body parser. Declared bodies over 1
MiB are rejected; production ingress must enforce the same limit for streamed
requests without a content length. Normal Nest routes continue through the
project's body parsers and CSRF middleware. Better Auth's cookie identity and
the non-production JWT demos are intentionally separate and do not authenticate
one another.

## Database

Runtime options live in `config/database.config.ts`; CLI options live in
`config/typeorm.data-source.ts`.

Application migrations that production may execute belong in `src/migrations/`.
The educational database migration instead lives beside its owner at
`src/examples/demo-database/migrations/`. Migration discovery includes that
feature directory in `development`, `test`, and guarded `provision`, but excludes
it in `production`.

`CreateBetterAuthTables1785801600000` is an application migration and therefore
runs in every environment. Better Auth uses its own `mysql2` pool against the
same database; TypeORM remains the migration owner.

```bash
pnpm migration:create src/migrations/CreateExample
pnpm migration:generate src/migrations/CreateExample
pnpm migration:run
pnpm migration:revert

# Commands against the compiled production artifact:
pnpm run build
pnpm migration:run:prod
pnpm migration:revert:prod
```

Excluding the Demo migration does not undo migration history. A production
database that ran `CreateDemoTable1760000000000` in an earlier release keeps
both its `demo` table and migration-history row; no automatic drop is attempted.
The migration class/name remains unchanged so TypeORM can continue to recognize
that history when the Demo migration set is enabled.

## Project layout

```text
config/              YAML/env validation and TypeORM CLI configuration
docs/                operational topic guides
scripts/             artifact and contract verification
src/bootstrap/       order-sensitive startup, HTTP, and shutdown composition
src/platform/        reusable infrastructure, runtime, observability, operations, and security capabilities
src/features/        supported production business capabilities
src/examples/        removable teaching examples, including the Demo migration
src/contracts/       pure framework-free contracts shared across owners
src/migrations/      application migrations discoverable in production
test/                focused e2e and full-infrastructure integration tests
```

Platform modules are explicit dependencies: a consuming Nest module imports
the capability module that exports its providers. The deliberate composition
exceptions are the global `ConfigModule` and the application-level TypeORM root
registration in `AppModule`; feature repositories still use
`TypeOrmModule.forFeature(...)` locally. See the architecture guide for the
complete dependency rules.

## Documentation

- [Architecture](docs/architecture.md)
- [Project map](docs/project-notes.zh-en.md)
- [Configuration](docs/configuration.md)
- [Database](docs/database.md)
- [Security and CSRF](docs/security.md)
- [Cache](docs/cache.md)
- [Queue](docs/queue.md)
- [Schedule](docs/schedule.md)
- [WebSocket](docs/websocket.md)
- [OpenAPI](docs/openapi.md)
- [AsyncAPI](docs/asyncapi.md)
- [Demo catalog](docs/demo.md)
- [Validation](docs/validation.md)
- [Internationalization](docs/i18n.md)
- [Serialization](docs/serialization.md)
- [Sentry](docs/sentry.md)
- [Logger](docs/logger.md)
- [Health checks](docs/health.md)

## Verification

CI enforces the complete sequence:

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

The image verification checks its non-root user and required runtime artifacts
and smoke-tests the packaged TypeORM CLI.

On SIGINT/SIGTERM the application becomes unready first, waits 5 seconds for
traffic propagation, drains HTTP before Nest destroys providers, closes Sentry,
and exits within a 17-second internal maximum. The production verifier waits
20 seconds and Compose grants 25 seconds; other supervisors must also use a
grace period longer than the internal budget.

`verify:migrations` and `test:full-app` mutate infrastructure;
`verify:production-start` connects to those same services and exercises real
Better Auth sign-up, session lookup, sign-out revocation, and sign-in. All three are
fail-closed and must run only against disposable local/CI services with explicit
loopback `DB_HOST`/`REDIS_URL`, an integer `DB_PORT` from 1 to 65535, explicit
`DB_USERNAME`/`DB_PASSWORD`, a database name ending in `_test`, `-test`, `_ci`,
or `-ci`, and:

```bash
export GNESTER_ALLOW_DESTRUCTIVE_INTEGRATION=true
export DB_HOST=127.0.0.1
export DB_PORT=3306
export DB_USERNAME=<disposable-user>
export DB_PASSWORD=<disposable-password>
export DB_DATABASE=gnester_test
export REDIS_URL=redis://127.0.0.1:6379
```

The safety wrapper reads these values directly from its parent process and does
not silently load dotenv files. TypeORM child processes still use the normal
runtime-first project dotenv precedence after the wrapper has approved the
explicit target.

The wrapper forces `NODE_ENV=provision` and disables CORS, CSRF, sessions,
schema synchronization, and Sentry for deterministic infrastructure coverage;
CSRF and session behavior have separate focused e2e/unit suites. `provision` is
an integration-only mode and must never be deployed.
