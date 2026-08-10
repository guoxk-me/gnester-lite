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
├── platform/                  reusable runtime capabilities
│   ├── infrastructure/        cache, outbound HTTP, queue
│   ├── runtime/               scheduling and managed runtime work
│   ├── observability/         logger and Sentry
│   ├── operations/            health and readiness
│   └── security/              auth, authorization, crypto, CSRF, rate limiting
├── features/                  production business capabilities
├── examples/                  removable teaching and integration examples
│   └── demo-database/
│       └── migrations/        non-production Demo schema history
├── contracts/                 pure, stable, framework-free shared contracts
└── migrations/                application migrations visible to production
```

### `src/bootstrap`

`bootstrap` owns order-sensitive integration with the running process and HTTP
server. It configures middleware, CORS, Helmet, global validation, versioning,
OpenAPI, the Socket.IO adapter, and graceful shutdown. It may orchestrate
platform services, but it must not contain feature business behavior.

`bootstrap` 负责与进程和 HTTP 服务有关、且顺序敏感的接入逻辑。它可以编排平台服务，但不能承载 Feature 业务逻辑。

### `src/platform`

`platform` owns reusable mechanisms that can serve more than one feature or
the application runtime itself. A capability keeps its Nest module, providers,
configuration adapter, and focused tests together.

Platform categories are ownership boundaries:

- `infrastructure`: external resource and client integrations.
- `runtime`: managed background work and runtime lifecycle.
- `observability`: logging, telemetry, and failure capture.
- `operations`: deployment and operator-facing capabilities.
- `security`: authentication, authorization, cryptography, and HTTP protection.

平台层保存可被多个 Feature 或应用运行时复用的机制；它不能依赖 `features`、`examples` 或 `bootstrap`。

### `src/features`

Production features own real business use cases such as identity, users,
orders, or payments. A feature keeps its controllers, services, DTOs, entities,
feature-specific migrations, local guards, adapters, tests, and documentation
contracts together. A feature may be optional in a deployment, but it remains a
feature when it is supported production behavior rather than teaching code.

Feature 负责正式生产环境中的完整纵向业务能力；是否每个部署都启用，不改变其生产功能属性。

### `src/examples`

Examples demonstrate platform capabilities without defining production
business behavior. `DemosModule` is the catalog boundary: it is enabled outside
production and excluded from the production module graph. The entire directory
must be removable without changing platform implementations or production
features.

Examples 用于教学和集成演示，可以整体删除，并且不会影响平台实现或正式生产 Feature。

### `src/contracts`

`contracts` is deliberately small. It contains only stable TypeScript values or
types that are genuinely shared across ownership boundaries. It must not import
NestJS, Express, TypeORM, platform modules, bootstrap code, features, or
examples. API DTOs belong to their owning feature or example, not to
`contracts`.

`contracts` 不是新的杂物箱；只有稳定、无框架、确实跨边界共享的类型或常量才能放入其中。

## Dependency direction / 依赖方向

```text
main / AppModule
    ├── bootstrap
    ├── platform
    ├── features
    └── examples

bootstrap ──> platform ──> contracts
features  ──> platform ──> contracts
examples  ──> platform ──> contracts
bootstrap / platform / features / examples ──> config
```

`config/` is a separate application-configuration boundary. `AppModule` loads
and validates it once; bootstrap, platform, features, and examples may consume
its typed values through `ConfigService` or import its TypeScript config types.

The following directions are forbidden:

- `platform -> features`
- `platform -> examples`
- `platform -> bootstrap`
- `features -> examples | bootstrap`
- `bootstrap -> features | examples`
- `contracts -> platform | features | examples | bootstrap | NestJS`
- one feature importing another feature's private implementation

Cross-feature behavior should be expressed through a platform capability, a
small framework-free contract, or an application-level event—not by reaching
into another feature's controller or service.

禁止平台层反向依赖 Feature 或 bootstrap，也禁止 Feature 直接引用另一个 Feature 的私有实现。

## Nest module composition / Nest 模块装配

Platform modules are not `@Global()`. A module that injects a platform provider
must import the module that exports it in its own `imports` array. This keeps
Redis, BullMQ, scheduling, HTTP client, auth, and other runtime dependencies
visible at the consumer boundary.

Examples:

- `CommonHealthModule` imports `CommonCacheModule` for Redis readiness.
- `DemoCacheModule` imports `CommonCacheModule`.
- `DemoHttpModule` imports `CommonHttpClientModule`.
- `DemoQueueModule` imports `CommonQueueModule` before registering its queues.
- `DemoScheduleModule` imports `CommonScheduleModule`.
- Auth-consuming features import `CommonAuthModule` explicitly.

平台模块不使用 `@Global()`；注入平台 provider 的模块必须显式导入其所属模块。

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
   BullMQ with queue infrastructure, Nest Schedule with schedule runtime,
   Terminus with health, EventEmitter with the demo-events feature, and
   `nestjs-i18n` via `I18nCatalogModule` / `CommonI18nModule`.

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

Application migrations that production may execute live in `src/migrations/`.
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
2. Is it a reusable runtime mechanism? Put it in the matching `platform`
   category.
3. Is it supported production business behavior? Keep it inside the owning
   feature.
4. Is it removable teaching or integration code? Keep it inside the owning
   example.
5. Is it pure TypeScript and genuinely shared across owners? It may belong in
   `contracts`.
6. Would the proposed dependency point from platform to a feature or example?
   Redesign the seam instead.

新增或移动文件时，应先判断所有权和依赖方向，而不是按“看起来通用”放入共享目录。
