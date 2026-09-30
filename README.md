# gnester-lite

A NestJS 12 ESM service template on Node.js 24 and pnpm 11.1.2, with MySQL 8 and Redis 7. It is the default companion backend for gvueter-lite and currently includes application sessions, user administration, invitations and a personal-model assistant.

通用 NestJS 服务模板，当前业务通过统一入口装配，继续支持 gvueter-lite 对接。Demo 目录与教学端点已移除；复用能力与业务边界见 [Architecture](docs/architecture.md)。

## Local development

```bash
pnpm install
cp .env.example .env.development.local
# Configure your own MySQL database and Redis URL first.
pnpm migration:run
pnpm start:dev
```

The root landing route is `/v1`; API routes use the configured prefix, `/api` by default. Health probes are `/api/health/live` and `/api/health/ready`. Current application routes are version-neutral.

For the initial administrator, the existing `pnpm admin:bootstrap` command requires `GNESTER_ALLOW_ADMIN_BOOTSTRAP=true`, explicit `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, and `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` in the process environment. It does not load dotenv files or support `--help`. See [Security](docs/security.md).

## Application contracts

| Area             | Routes                                                                        |
| ---------------- | ----------------------------------------------------------------------------- |
| Session          | `GET /api/session`, `POST /api/session/login`, `/refresh`, `/logout`          |
| Users            | `/api/admin/users`, name/status updates and batch status changes              |
| Invitations      | `/api/admin/invitations`, resend/revoke, public preview/accept                |
| Browser security | `GET /api/security/csrf-token`                                                |
| Assistant        | `/api/assistant/conversations`, questions, answer regeneration/selection/stop |
| Personal models  | `/api/assistant/configuration`, keys, preferences and OpenAI consent          |

Browser authentication uses HttpOnly `gvueter_access` and `gvueter_refresh` cookies. `GET /api/session` also seeds the readable `XSRF-TOKEN` cookie, including when it returns 401. Unsafe requests send `X-XSRF-TOKEN`; credentials, invitation tokens and provider keys must not appear in backend request URLs or logs. The response envelope is `{ code, message, data, errors }`; health probes retain native Terminus responses. See [Security](docs/security.md) and [OpenAPI](docs/openapi.md).

Assistant responses are persisted and read by HTTP polling. Generation uses BullMQ in the same process. Each account owns its encrypted provider keys and model choices; raw keys are never returned to the browser. No real provider request is needed for unit/E2E verification.

## Source structure

```text
src/bootstrap/       order-sensitive application startup and shutdown
src/config/          configuration values and validation
src/common/          small protocols, metadata and shared constraints
src/infra/           complete non-business runtime facilities
src/modules/         identity and assistant, assembled by ApplicationModule
```

Types, DTOs and unit tests belong to their module. Small modules stay flat; larger ones split by responsibility. `common` is not a general dumping ground and there is no central type mirror tree.

## Verification

```bash
pnpm run format:check
pnpm run lint:check
pnpm run typecheck
pnpm run test
pnpm run test:e2e
pnpm run test:architecture
pnpm run test:integration-policy
pnpm run build
pnpm run verify:architecture
pnpm run verify:artifact
pnpm run verify:openapi
```

CI additionally checks coverage, peers, container references, code documentation, shutdown timing, Docker and guarded integration. `verify:migrations`, `test:full-app` and `verify:production-start` require explicitly disposable MySQL/Redis services and the safety gate in `scripts/run-destructive-integration.mjs`. Never run them against production.

## Production

Set `NODE_ENV=production` with validated database credentials, Redis URL, trusted CORS origins, JWT/encryption/HMAC secrets and a CSRF secret when enabled. Configure same-origin reverse proxying for the frontend and backend. Run `pnpm build`, then `pnpm migration:run:prod` during the controlled deployment and `pnpm start:prod`.

Application migrations are emitted to `dist/src/infra/database/migrations/`; the CLI data source is `dist/src/infra/database/typeorm.data-source.js`. Migration names and existing history stay unchanged. Removing Demo discovery does not delete pre-existing Demo tables. Production never uses database synchronization.

Direct dependency versions are defined in the strict catalog in `pnpm-workspace.yaml`; package entries remain `catalog:`. The `v11` branch remains the NestJS 11 line; this branch uses NestJS 12, ESM and Vitest.

## Guides

- [Architecture](docs/architecture.md)
- [Configuration](docs/configuration.md)
- [Database](docs/database.md)
- [Security](docs/security.md)
- [OpenAPI](docs/openapi.md)
- [Internationalization](docs/i18n.md)
- [Health](docs/health.md)
- [Cache](docs/cache.md), [Queue](docs/queue.md), [Scheduling](docs/schedule.md)
- [Logging](docs/logger.md), [Sentry](docs/sentry.md), [Validation](docs/validation.md)

Historical audits and plans retain their dates and earlier decisions. Current placement rules are defined by the architecture guide and enforced by the source-boundary checker.
