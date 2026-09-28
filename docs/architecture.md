# Architecture / 架构

gnester-lite separates application composition, reusable runtime capabilities,
feature ownership, and framework-free contracts. A file's directory should
answer who owns it and which direction it may depend on.

gnester-lite 将应用装配、可复用运行能力、功能所有权和无框架契约分开。文件所在目录应能直接说明其所有者以及允许的依赖方向。

## Source layout / 源码布局

```text
src/
├── app.module.ts              application composition root
├── main.ts                    process entry point
├── instrument.ts              pre-bootstrap telemetry initialization
├── bootstrap/                 startup, HTTP pipeline, and shutdown policy
│   └── http/                  CORS, Helmet, validation, OpenAPI, Socket.IO adapter
├── auth/ authorization/       authentication and access rules
├── better-auth/ crypto/ csrf/  security integrations
├── cache/ http-client/ queue/  external resource integrations
├── logger/ sentry/ health/     observability and operations
├── i18n/ schedule/ rate-limit/ runtime capabilities
├── config/                    YAML and environment configuration
├── database/
│   └── migrations/            application migrations visible to production
├── <business-name>/           future production business capabilities
├── examples/                  removable teaching and integration examples
│   └── demo-database/
│       └── migrations/        non-production Demo schema history
└── contracts/                 pure, stable, framework-free shared contracts
```

### `src/bootstrap`

`bootstrap` owns order-sensitive integration with the running process and HTTP
server. It configures middleware, CORS, Helmet, global validation, versioning,
OpenAPI, the Socket.IO adapter, and graceful shutdown. It may orchestrate
capability services, but it must not contain business behavior.

`bootstrap` 负责与进程和 HTTP 服务有关、且顺序敏感的接入逻辑。它可以编排平台服务，但不能承载 Feature 业务逻辑。

### Top-level capabilities

Reusable capabilities live directly under `src/` in folders named for their
responsibility. Each keeps its Nest module, providers, configuration adapter,
and focused tests together. Capability code may depend on other capabilities
and `contracts`, but not on a business module, `examples`, or `bootstrap`.

可复用能力直接放在 `src/` 下，按职责命名；不能反向依赖业务模块、`examples` 或 `bootstrap`。

### Production business folders

Production business folders live directly under `src/`, for example `users/`
or `orders/`. A business folder keeps its controllers, services, DTOs, entities,
local guards, adapters, tests, and documentation
contracts together. A feature may be optional in a deployment, but it remains a
feature when it is supported production behavior rather than teaching code.

正式业务模块直接放在 `src/<business-name>/`，并拥有自己的完整纵向能力。

### `src/examples`

Examples demonstrate reusable capabilities without defining production
business behavior. `DemosModule` is the catalog boundary: it is enabled outside
production and excluded from the production module graph. The entire directory
must be removable without changing capability implementations or production
business modules.

Examples 用于教学和集成演示，可以整体删除，并且不会影响可复用能力或正式业务模块。

### `src/contracts`

`contracts` is deliberately small. It contains only stable TypeScript values or
types that are genuinely shared across ownership boundaries. It must not import
NestJS, Express, TypeORM, capability modules, bootstrap code, business modules, or
examples. API DTOs belong to their owning feature or example, not to
`contracts`.

`contracts` 不是新的杂物箱；只有稳定、无框架、确实跨边界共享的类型或常量才能放入其中。

## Dependency direction / 依赖方向

```text
main / AppModule
    ├── bootstrap
    ├── capabilities
    ├── business folders
    └── examples

bootstrap        ──> capabilities ──> contracts
business folders ──> capabilities ──> contracts
examples         ──> capabilities ──> contracts
bootstrap / capabilities / business folders / examples ──> config
```

`src/config/` is a separate application-configuration boundary. `AppModule` loads
and validates it once; bootstrap, capabilities, business folders, and examples may consume
its typed values through `ConfigService` or import its TypeScript config types.

The following directions are forbidden:

- `capability -> business folder | examples | bootstrap`
- `business folder -> examples | bootstrap | another business folder's private implementation`
- `bootstrap -> business folder | examples`
- `contracts -> capability | business folder | examples | bootstrap | NestJS`

Cross-feature behavior should be expressed through a reusable capability, a
small framework-free contract, or an application-level event—not by reaching
into another feature's controller or service.

禁止能力目录反向依赖业务模块、Example 或 bootstrap，也禁止业务模块直接引用另一个业务模块的私有实现。

## Nest module composition / Nest 模块装配

Capability modules are not `@Global()`. A module that injects a capability provider
must import the module that exports it in its own `imports` array. This keeps
Redis, BullMQ, scheduling, HTTP client, auth, and other runtime dependencies
visible at the consumer boundary.

Examples:

- `HealthModule` imports `CacheModule` for Redis readiness.
- `DemoCacheModule` imports `CacheModule`.
- `DemoHttpModule` imports `HttpClientModule`.
- `DemoQueueModule` imports `QueueModule` before registering its queues.
- `DemoScheduleModule` imports `ScheduleModule`.
- Auth-consuming business modules import `AuthModule` explicitly.

能力模块不使用 `@Global()`；注入其 provider 的模块必须显式导入所属模块。

### Deliberate exceptions / 明确例外

The exceptions are narrow and live at composition boundaries:

1. `ConfigModule.forRoot({ isGlobal: true })` is registered once in
   `AppModule`. `ConfigService` is therefore available without repeating
   `ConfigModule` in every capability. Configuration values are still validated
   centrally before providers consume them.
2. `TypeOrmModule.forRootAsync(...)` is registered once in `AppModule` because
   the database connection is application infrastructure. A feature that owns
   repositories must still declare `TypeOrmModule.forFeature(...)` locally.
3. `APP_GUARD` in the rate-limit module, `APP_FILTER` in the Sentry module, and
   `APP_INTERCEPTOR` / `APP_FILTER` in the i18n envelope module intentionally
   have application-wide behavior. Their owning modules are nevertheless
   explicitly imported by `AppModule`.
4. Framework root registrations stay with the narrowest owning module:
   BullMQ with queue, Nest Schedule with schedule,
   Terminus with health, EventEmitter with the demo-events feature, and
   `nestjs-i18n` via `I18nCatalogModule` / `I18nModule`.

这些例外只解决框架根注册问题，不授权新增隐藏依赖或新的全局业务模块。

## Application composition / 应用装配

`AppModule` is the only application composition root. It always composes
configuration, TypeORM, Sentry, i18n envelope, CSRF, health, logging, and rate
limiting.
Optional infrastructure follows the feature that consumes it. `DemosModule`
is included only when `NODE_ENV` is not `production`; its queue feature is
omitted from the ordinary unit-test module graph to avoid starting workers.

`src/instrument.ts` must remain the first import from `src/main.ts` so Sentry
can initialize before Nest and application modules load.

## Migration ownership / 迁移所有权

Application migrations that production may execute live in `src/database/migrations/`.
Business schema changes are owned by their business module but stored in this
production migration directory so the data source discovers them.
The Demo database migration is owned by its example at
`src/examples/demo-database/migrations/`.

Migration discovery is environment-aware:

- `development`, `test`, and guarded `provision` discover the application and
  Demo migration directories.
- `production` discovers only application migrations and never discovers the
  example-owned Demo migration. A new production database therefore does not
  create the `demo` table.

Changing discovery does not perform a rollback. If an existing production
database ran `CreateDemoTable1760000000000` before this boundary was introduced,
its table and TypeORM migration-history row remain. The migration class/name is
kept unchanged so environments that opt into Demo migrations recognize the
existing history instead of treating it as a new migration.

生产数据源不会发现 Demo migration；但该规则不会自动删除旧生产库中已经存在的
`demo` 表，也不会改写既有 TypeORM migration history。

## Placement checklist / 放置检查

Before adding or moving a file, ask:

1. Is it order-sensitive process or HTTP setup? Put it in `bootstrap`.
2. Is it a reusable runtime mechanism? Put it in its own top-level capability folder.
3. Is it supported production business behavior? Keep it inside the owning
   top-level business folder.
4. Is it removable teaching or integration code? Keep it inside the owning
   example.
5. Is it pure TypeScript and genuinely shared across owners? It may belong in
   `contracts`.
6. Would the proposed dependency point from a capability to a business folder or example?
   Redesign the seam instead.

新增或移动文件时，应先判断所有权和依赖方向，而不是按“看起来通用”放入共享目录。
