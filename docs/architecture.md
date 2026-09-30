# Architecture / 架构

<!-- AI modified: the confirmed ownership model replaces flat capabilities, centralized types and the Demo catalog. -->

gnester-lite is a reusable NestJS service template and the default companion server for gvueter-lite. Current identity and assistant behavior stays enabled through one replaceable application composition module. Both repositories remain independently delivered; this change does not reorganize the frontend.

gnester-lite 保持通用服务模板定位，当前身份与助手业务继续用于 gvueter-lite 对接。目录表达所有权；真正的运行边界由 Nest imports/providers/exports 和架构检查共同落实。

## Source ownership / 目录所有权

```text
src/
├── main.ts / instrument.ts / app.module.ts
├── bootstrap/                 process startup, HTTP registration and shutdown
├── config/                    configuration values, types and validation
├── common/                    small shared protocols, metadata and validation constants
│   ├── http/                  envelope contract and route metadata
│   └── validation/            shared input constraints
├── infra/                     complete non-business runtime facilities
│   ├── auth/ authorization/   reusable token/password and access-control mechanisms
│   ├── database/              TypeORM configuration, CLI entry and migrations
│   ├── http/                  localized response and exception pipeline
│   ├── i18n/                  catalog, translation and language negotiation
│   ├── cache/ queue/ http-client/
│   ├── crypto/ csrf/ rate-limit/
│   └── health/ schedule/ logger/ sentry/
└── modules/
    ├── application.module.ts   current supported business composition
    ├── identity/              accounts, sessions, invitations and user administration
    └── assistant/             conversations, answer generation and personal models
```

Only create directories that already have a responsibility. Small modules stay flat; larger modules split by actual behavior. Do not pre-create controllers/services/repositories folders for symmetry. DTOs, local types, constants, adapters and unit tests remain with their owner. There is no central `src/types/`, `platform/`, `features/`, or runnable Demo catalog.

小模块平铺，大模块按实际职责拆分。类型就近保存，单文件私有类型也可直接留在使用处；跨模块复用并不自动改变所有权。不要建立全局类型 barrel 或仅转发 ORM 方法的 Repository。

### Common and infrastructure

`common` stays small. HTTP envelope contracts and skip-envelope metadata do not import their runtime executors. Framework metadata decorators may use Nest/Swagger, but common must not import infrastructure, configuration or business implementation.

`infra` includes both external resource adapters and non-business runtime mechanisms: database, Redis cache, queue, scheduling, HTTP clients, translation, logging, cryptography, CSRF, throttling and health probes. Each facility owns its module, providers, configuration adapter and tests together. A cache interceptor stays with cache; a telemetry filter stays with Sentry.

`infra/http` owns response wrapping, localized failures and their global providers. It imports the catalog-only `infra/i18n` module. CSRF also imports that catalog without registering response providers a second time. `bootstrap` installs validation and middleware in their required order. Global registration does not change ownership.

### Identity and assistant

`identity` owns the `user`, `account`, `session`, `verification` and invitation lifecycle. Its session guard checks the existing signed access cookie and live account/session state. The admin guard checks the current database role. Controllers pass checked user IDs to business services; assistant services do not accept Express requests or query identity-owned tables.

`IdentityModule` exports the session boundary through `ApplicationAuthModule`. `AssistantModule` imports `IdentityModule` explicitly. Public identity entry points are the owning module, session guard, current-session-user decorator and session-user contract. Session persistence types and management services stay private.

`assistant` owns conversation/turn/answer persistence and personal provider credentials, model catalogs and preferences. Responsibilities are separated into conversation operations, durable generation transitions, personal configuration, provider protocols and scheduled catalog synchronization. Provider SDK access stays inside assistant because it is currently specific to its personal-model behavior. Secrets remain encrypted; the refactor does not introduce a shared credential store.

The API and worker remain a modular monolith with one process by default. HTTP polling, queue names, cookie names and existing endpoint payloads remain compatible with gvueter-lite. Independent worker deployment, generated frontend clients and new authorization product features require separate work.

## Dependency rules / 依赖规则

| Owner                | Allowed project dependencies                                                            |
| -------------------- | --------------------------------------------------------------------------------------- |
| `modules/<business>` | Its own implementation, infra, common, config, another business's declared public entry |
| `infra/<facility>`   | Other infra facilities, common, config                                                  |
| `common`             | Common only; platform APIs and metadata framework dependencies are permitted            |
| `config`             | Configuration only and external loading/validation libraries                            |
| `bootstrap`          | Bootstrap, infra, common, config                                                        |
| `AppModule`          | Application and infrastructure composition                                              |

Business modules must not access another owner's private service, persistence type or table. Use an explicitly exported business method. Cross-module dependencies must also be reflected in Nest imports/exports; re-registering another module's provider is forbidden. Circular source dependencies are forbidden, including type-only edges. Do not use `forwardRef()` to hide unclear ownership.

`scripts/verify-source-boundaries.mjs` resolves imports with the actual TypeScript configuration, including aliases, type queries, re-exports and literal dynamic imports. Its regression suite checks private business access, reverse dependencies and retired source layers. `verify:architecture` additionally checks compiled consumer imports, public Nest exports, migration discovery and the production graph.

## Composition and deliberate exceptions

`AppModule` is the root: validated global configuration, one TypeORM root connection, HTTP response pipeline, CSRF, health, logging, Sentry, rate limiting and `ApplicationModule`. Current business modules are registered only through `ApplicationModule`, so template adopters have one clear replacement point.

Capability modules are not `@Global()`. Consumers import the module that exports the provider they inject. Framework root registrations stay with their owner: BullMQ with queue, Nest Schedule with schedule, Terminus with health, and the translation catalog with i18n.

`ConfigModule.forRoot({ isGlobal: true })` is the configuration exception. TypeORM connects once at the application root; a future ORM entity owner declares `TypeOrmModule.forFeature(...)` locally. APP_GUARD/FILTER/INTERCEPTOR providers are registered once in their owning infrastructure module.

`instrument.ts` remains the first import in `main.ts`. Startup and shutdown preserve middleware order, readiness draining, dependency teardown and telemetry flushing.

## Database history / 数据库历史

All application migrations live in `src/infra/database/migrations/`; every environment discovers that same application history. CLI scripts use `dist/src/infra/database/typeorm.data-source.js`. Existing production migration class names and SQL stay unchanged.

The Demo source and migration discovery have been removed. This does not drop any existing Demo table or alter an existing TypeORM history row. No database reset or data migration is part of the architecture refactor. Do not enable synchronization in production.

Business SQL stays in the owning module. Introduce a repository only when it isolates meaningful persistence behavior or repeated queries; do not move user queries into `infra/database` just because they use a database.

## Verification and maintenance

Unit tests are colocated; HTTP E2E tests live in `test/e2e`, guarded real-infrastructure tests in `test/integration`. Test-owned fixtures can exercise generic protocol behavior without restoring teaching endpoints to the application.

For changes to module ownership run type checks, lint, tests, build, architecture, OpenAPI and build-artifact checks. Full infrastructure verification follows CI and uses disposable MySQL/Redis only. Report executed commands separately from inspected assumptions.

Current guides live directly in `docs/`. Dated audits/plans and `docs/history/` preserve earlier decisions; they are historical evidence, not current placement instructions.
