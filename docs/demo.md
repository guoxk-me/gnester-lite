# Demo Guide / 示例指南

This document records the removable demo modules under `src/examples/`.

本文档记录 `src/examples/` 下可整体移除的 Demo，方便开发者和 AI agent 快速理解这些示例在演示什么。

## Runtime Setup / 运行入口

`src/examples/demos.module.ts` aggregates the removable demo catalog.
Development imports the full catalog. Production excludes `DemosModule`
entirely, so no demo route or worker exists. Test imports the catalog but omits
`DemoQueueModule`. `NODE_ENV=provision` includes every demo and queue worker only
for guarded, disposable integration. See `docs/project-notes.zh-en.md` for the
complete module list.

`src/examples/demos.module.ts` 聚合可整体移除的示例目录。生产环境完全排除
`DemosModule`；测试环境仅排除 `DemoQueueModule`；`provision` 只在有安全门的隔离
集成中启用完整 demo 与 worker。

The database demo intentionally focuses on database scenarios only. It does not demonstrate interceptors, cache, or scheduled jobs.

数据库 demo 只关注数据库场景，不演示接口版本、拦截器、缓存或定时任务。

All `POST`, `PUT`, `PATCH`, and `DELETE` request sketches below require the
cookie-jar plus `x-csrf-token` flow from the README while
`CSRF_ENABLED=true`. Route snippets show the body contract; they do not bypass
global middleware.

## Demo Config / 配置示例

Files / 文件：

- `src/examples/demo-config/demo-config.module.ts`
- `src/examples/demo-config/demo-config.controller.ts`
- `src/examples/demo-config/demo-config.service.ts`

Route / 路由：

```http
GET /demo-config
```

Example response / 示例响应：

```json
{
  "appName": "gnester-lite"
}
```

What it shows / 演示点：

- `ConfigModule` is global, so feature services can inject `ConfigService`.
  `ConfigModule` 是全局模块，feature service 可以直接注入 `ConfigService`。
- Required config uses `getOrThrow()`.
  必填配置使用 `getOrThrow()` 读取。
- `app.name` comes from `config/config.yaml`.
  `app.name` 来自 `config/config.yaml`。

## Demo Auth / 认证示例

Files / 文件：

- `src/platform/security/auth/auth.module.ts`
- `src/platform/security/auth/auth.guard.ts`
- `src/examples/demo-auth/local-auth.guard.ts`
- `src/platform/security/auth/guards/jwt-auth.guard.ts`
- `src/platform/security/auth/strategies/jwt.strategy.ts`
- `src/platform/security/auth/decorators/public.decorator.ts`
- `src/platform/security/auth/decorators/current-user.decorator.ts`
- `src/examples/demo-auth/demo-auth.module.ts`
- `src/examples/demo-auth/demo-auth.controller.ts`
- `src/examples/demo-auth/demo-auth.service.ts`
- `src/examples/demo-auth/local.strategy.ts`

Routes / 路由：

```http
GET /demo-auth/scenarios
POST /demo-auth/login
GET /demo-auth/profile
```

Demo login / 示例登录：

```http
POST /demo-auth/login
Content-Type: application/json

{
  "username": "admin@example.com",
  "password": "admin12345"
}
```

Protected profile / 受保护 profile：

```http
GET /demo-auth/profile
Authorization: Bearer <accessToken>
```

What it shows / 演示点：

- Follows the NestJS Passport recipe: `PassportModule` + `LocalStrategy` / `JwtStrategy`.
  遵循 NestJS Passport 配方：`PassportModule` + `LocalStrategy` / `JwtStrategy`。
- `LocalAuthGuard` validates username/password on login; `DemoAuthService.validateUser` / `login` issue the JWT.
  `LocalAuthGuard` 在登录时校验用户名密码；`DemoAuthService.validateUser` / `login` 签发 JWT。
- `JwtAuthGuard` + `JwtStrategy` validate `Authorization: Bearer <token>` and write `request.user`.
  `JwtAuthGuard` + `JwtStrategy` 校验 `Authorization: Bearer <token>` 并把用户写入 `request.user`。
- The hand-rolled `AuthGuard` remains for other demos (for example authorization) that still use it.
  手写 `AuthGuard` 仍保留，供其他仍在使用它的演示（例如 authorization）。
- `demo-auth` applies guards only to login and profile; its scenario catalog
  has no authentication guard. `demo-authorization` instead applies
  `AuthGuard` at controller level and uses `@Public()` on its scenario catalog
  as a real, explicit escape hatch.
  `demo-auth` 只在登录与 profile 路由挂载守卫，其场景目录没有鉴权守卫；
  `demo-authorization` 则在 controller 级挂载 `AuthGuard`，并在场景目录使用
  `@Public()` 形成真实、显式的例外。
- `@CurrentUser()` exposes the verified JWT payload to controllers.
  `@CurrentUser()` 将已校验的 JWT payload 暴露给 controller。
- Passwords are verified with salted hashes, not plaintext comparison.
  密码使用加盐哈希校验，不做明文比较。

## Demo Security / 安全响应头示例

Files / 文件：

- `src/bootstrap/http/helmet-options.ts`
- `src/bootstrap/configure-application.ts`
- `src/examples/demo-security/demo-security.module.ts`
- `src/examples/demo-security/demo-security.controller.ts`
- `src/examples/demo-security/demo-security.service.ts`
- `src/examples/demo-security/dto/*.ts`

Route / 路由：

```http
GET /demo-security
```

Example response shape / 示例响应结构：

```json
{
  "middleware": "helmet",
  "registration": "global bootstrap middleware before compression, cookies, sessions, pipes, versioning, and routes",
  "headers": [
    {
      "name": "Content-Security-Policy",
      "defaultValue": "default-src 'self'; object-src 'none'; base-uri 'self'",
      "purpose": "Restricts browser-loadable resources to reduce XSS and content injection risk."
    }
  ],
  "scenarios": [
    "Public REST APIs that should not leak framework fingerprints",
    "Browser-consumed APIs that need baseline XSS and clickjacking headers",
    "Production HTTPS services that should emit HSTS"
  ],
  "notes": []
}
```

What it shows / 演示点：

- Helmet is applied directly with `app.use(helmet(createHelmetOptions(nodeEnv)))`
  in `src/bootstrap/configure-application.ts` before
  compression, cookies, sessions, pipes, versioning, and route handling.
  Helmet 在 `src/bootstrap/configure-application.ts` 中直接注册，早于压缩、
  cookie、session、pipe、版本化和路由处理。
- `createHelmetOptions()` centralizes environment-specific security header
  decisions. `createHelmetOptions()` 集中管理按环境变化的安全响应头配置。
- Development and test disable HSTS plus CSP `upgrade-insecure-requests`, so
  local HTTP remains usable. development 和 test 环境关闭 HSTS 以及 CSP
  `upgrade-insecure-requests`，避免影响本地 HTTP 开发。
- Production enables HSTS with `max-age=31536000; includeSubDomains`.
  production 环境启用 `max-age=31536000; includeSubDomains` 的 HSTS。
- `crossOriginEmbedderPolicy` is disabled by default because general Nest
  templates often add Swagger, GraphQL sandboxes, or third-party browser assets.
  默认关闭 `crossOriginEmbedderPolicy`，因为通用 Nest 模板经常接入 Swagger、GraphQL sandbox 或第三方浏览器资源。
- The feature module only documents observable behavior; global security
  middleware stays in bootstrap code because middleware order is a startup
  concern. feature 模块只说明可观察行为；全局安全中间件保留在启动代码中，因为中间件顺序属于启动层职责。

## Demo Sentry / Sentry 示例

Files / 文件：

- `src/instrument.ts`
- `src/platform/observability/sentry/sentry.module.ts`
- `src/platform/observability/sentry/with-sentry-isolation.ts`
- `src/examples/demo-sentry/demo-sentry.module.ts`
- `src/examples/demo-sentry/demo-sentry.controller.ts`
- `src/examples/demo-sentry/demo-sentry.service.ts`
- `src/examples/demo-sentry/dto/*.ts`
- `docs/sentry.md`

Routes / 路由：

```http
GET /demo-sentry/scenarios
GET /demo-sentry/status
GET /demo-sentry/debug-sentry
```

What it shows / 演示点：

- `instrument.ts` initializes Sentry before Nest bootstraps.
  `instrument.ts` 在 Nest 启动前初始化 Sentry。
- Empty `SENTRY_DSN` keeps the template runnable without a Sentry project.
  留空 `SENTRY_DSN` 即可在没有 Sentry 项目时运行模板。
- `SentryGlobalFilter` captures unexpected HTTP errors; `HttpException` is
  skipped by default.
  `SentryGlobalFilter` 捕获未预期 HTTP 错误；`HttpException` 默认不上报。
- Cron, queue, and event handlers use `withSentryIsolation()`.
  定时任务、队列和事件处理使用 `withSentryIsolation()`。

## Demo CSRF / CSRF 示例

Files / 文件：

- `src/platform/security/csrf/csrf.module.ts`
- `src/platform/security/csrf/csrf.service.ts`
- `src/examples/demo-csrf/demo-csrf.module.ts`
- `src/examples/demo-csrf/demo-csrf.controller.ts`
- `src/examples/demo-csrf/demo-csrf.service.ts`
- `src/examples/demo-csrf/dto/*.ts`

Routes / 路由：

```http
GET /demo-csrf
GET /demo-csrf/token
POST /demo-csrf/transfer-preview
```

Token flow / Token 流程：

```http
GET /demo-csrf/token
```

```json
{
  "csrfToken": "<token>",
  "headerName": "x-csrf-token"
}
```

Protected mutation / 受保护写请求：

```http
POST /demo-csrf/transfer-preview
x-csrf-token: <token>
Content-Type: application/json

{
  "recipient": "alice@example.com",
  "amount": 25
}
```

`recipient` must contain non-whitespace text and is limited to 120 characters.
`recipient` 必须包含非空白字符，且最多 120 个字符。

What it shows / 演示点：

- `CsrfService` wraps `csrf-csrf` behind a Nest provider so bootstrap code and
  controllers share the same token settings.
  `CsrfService` 用 Nest provider 封装 `csrf-csrf`，让启动代码和 controller 共享同一套 token 配置。
- `src/bootstrap/configure-application.ts` registers CSRF after cookie/session
  middleware and before global pipes and routes. 该启动编排在 cookie/session
  中间件之后、全局 pipe 和路由之前注册 CSRF。
- Browser clients fetch a token first, then submit it in `x-csrf-token` for
  unsafe methods. 浏览器客户端先获取 token，再在 unsafe method 中通过
  `x-csrf-token` 提交。
- Missing or invalid tokens return a stable enveloped 403
  (`code: 403`, localized `message`, `data: null`).
  token 缺失或无效时返回统一信封的 403（`code: 403`、可本地化 `message`、`data: null`）。
- The overview endpoint documents when CSRF is needed and when bearer-token APIs
  usually do not need it. overview 接口说明哪些场景需要 CSRF，以及为什么纯 bearer-token API 通常不需要。

## Demo Crypto / 加密与哈希示例

Files / 文件：

- `src/platform/security/crypto/crypto.module.ts`
- `src/platform/security/crypto/symmetric-encryption.service.ts`
- `src/platform/security/crypto/secure-token.service.ts`
- `src/platform/security/crypto/hmac-signature.service.ts`
- `src/examples/demo-crypto/demo-crypto.module.ts`
- `src/examples/demo-crypto/demo-crypto.controller.ts`
- `src/examples/demo-crypto/demo-crypto.service.ts`

Routes / 路由：

```http
GET /demo-crypto/scenarios
POST /demo-crypto/encrypt-secret
POST /demo-crypto/one-time-token
POST /demo-crypto/webhook-signature
```

What it shows / 演示点：

- `SymmetricEncryptionService` uses versioned `aes-256-gcm` payloads for recoverable secrets.
  `SymmetricEncryptionService` 使用带版本的 `aes-256-gcm` 密文保存可恢复密钥。
- The authenticated context binds ciphertext to a tenant, user, or purpose.
  authenticated context 将密文绑定到租户、用户或用途。
- `SecureTokenService` returns a one-time raw token but stores only a SHA-256 digest.
  `SecureTokenService` 只展示一次原始 token，持久化时只存 SHA-256 摘要。
- `HmacSignatureService` signs raw payload strings and rejects tampered payloads with timing-safe comparison.
  `HmacSignatureService` 对原始 payload 字符串签名，并用 timing-safe comparison 拒绝篡改。

Environment / 环境变量：

- `ENCRYPTION_KEY`: base64url-encoded 32-byte key for `aes-256-gcm`.
- `HMAC_SECRET`: secret used for HMAC payload signatures.

`ENCRYPTION_KEY` and `HMAC_SECRET` are required in production. Development and test use local defaults so the template remains runnable.

生产环境必须设置 `ENCRYPTION_KEY` 和 `HMAC_SECRET`。开发和测试环境使用本地默认值，保证模板可直接运行。

## Demo Database / 数据库示例

Files / 文件：

- `src/examples/demo-database/demo-database.module.ts`
- `src/examples/demo-database/demo-database.controller.ts`
- `src/examples/demo-database/demo-database.service.ts`
- `src/examples/demo-database/entities/demo.entity.ts`
- `src/examples/demo-database/migrations/1760000000000-CreateDemoTable.ts`
- `src/examples/demo-database/dto/bulk-create-demo.dto.ts`
- `src/examples/demo-database/dto/create-demo.dto.ts`
- `src/examples/demo-database/dto/demo-mapped-types.dto.ts`
- `src/examples/demo-database/dto/list-demo-query.dto.ts`
- `src/examples/demo-database/dto/search-demo-query.dto.ts`
- `src/examples/demo-database/dto/update-demo.dto.ts`

### Migration Opt-in / 迁移按环境启用

The `demo` table migration is owned by `demo-database`, not by the production
application migration directory. TypeORM migration discovery includes it in
`development`, `test`, and guarded `provision`. The `production` data source
does not discover it, so running production migrations against a new database
does not create the Demo table.

`demo` 表迁移归 `demo-database` Feature 所有，不属于生产应用迁移目录。
`development`、`test` 和受安全门保护的 `provision` 会发现它；`production`
数据源不会发现，因此全新生产库不会创建 Demo 表。

Exclusion is not deletion. A production database that ran the migration in an
older release keeps its `demo` table and migration-history row. The migration
class/name remains `CreateDemoTable1760000000000` so existing TypeORM history is
recognized whenever Demo migrations are enabled; no table is automatically
dropped.

排除发现不等于删除：旧生产库中已经存在的 `demo` 表和迁移记录会继续保留，系统不会
自动执行 drop。

Entity / 实体：

```ts
Demo {
  id: number;
  name: string;
  description: string;
}
```

`name` and `description` must contain non-whitespace text. `name` has max
length `20`; `description` has max length `255`.

`name` 与 `description` 都必须包含非空白字符；`name` 最多 20 个字符，
`description` 最多 255 个字符。

### APIs / 接口

Create one / 创建一条：

```http
POST /demo-database
Content-Type: application/json

{
  "name": "hello",
  "description": "first demo"
}
```

Create many in a transaction / 使用事务批量创建：

```http
POST /demo-database/many
Content-Type: application/json

[
  {
    "name": "first",
    "description": "first demo"
  },
  {
    "name": "second",
    "description": "second demo"
  }
]
```

Both raw-array and wrapped bulk-create forms require 1–50 records per request.
原始数组和包裹 DTO 两种批量创建形式每次都只接受 1–50 条记录。

Create with audit metadata / 使用审计元数据创建：

```http
POST /demo-database/with-audit
Content-Type: application/json

{
  "name": "hello",
  "description": "first demo",
  "requestId": "req-001"
}
```

Name-only mapped DTO / 仅名称 mapped DTO：

```http
POST /demo-database/name-only
Content-Type: application/json

{
  "name": "hello"
}
```

Create many with a wrapped DTO / 使用包裹 DTO 批量创建：

```http
POST /demo-database/many/wrapped
Content-Type: application/json

{
  "items": [
    {
      "name": "first",
      "description": "first demo"
    }
  ]
}
```

Find all / 查询全部：

```http
GET /demo-database
```

The legacy unpaged list and name-search routes return at most 100 rows in
ascending ID order. Use `/demo-database/page` to traverse the complete table.
旧版非分页列表与名称搜索接口均按 ID 升序最多返回 100 行；如需遍历完整数据，请使用
`/demo-database/page`。

Find page / 分页查询：

```http
GET /demo-database/page?page=1&limit=10&order=ASC
```

Page numbers are limited to 10,000 and page size to 100 so offset pagination
stays within the demo contract.

Find by ids / 按 ID 批量查询：

```http
GET /demo-database/by-ids?ids=1,2,3
```

`ids` accepts 1–50 comma-separated integers in the signed MySQL `INT` primary
key domain (`1`–`2147483647`). The same range applies to every `:id` path.
`ids` 接受 1–50 个以逗号分隔、位于 MySQL 有符号 `INT` 主键范围内的整数
（`1`–`2147483647`）；所有 `:id` 路径使用相同范围。

Search by name / 按名称搜索：

```http
GET /demo-database/search?keyword=hello
```

`keyword` must contain a non-whitespace character and is limited to 20
characters. Search is a literal substring match: `%`, `_`, and `!` in the input
match those characters instead of becoming SQL `LIKE` wildcards. The query uses
`ESCAPE '!'`, including `!!` for a literal `!`, so behavior does not depend on
MySQL's backslash SQL mode.

`keyword` 必须包含非空白字符，且最多 20 个字符。搜索采用字面子串语义：输入中的
`%`、`_` 和 `!` 都按字符本身匹配，不会成为 SQL `LIKE` 通配符。查询明确使用
`ESCAPE '!'`，其中字面 `!` 写成 `!!`，因此行为不依赖 MySQL 的反斜杠 SQL 模式。

Count rows / 统计行数：

```http
GET /demo-database/count
```

Parse boolean query / 解析布尔查询参数：

```http
GET /demo-database/flags?enabled=true
```

Parse UUID path param / 解析 UUID 路径参数：

```http
GET /demo-database/uuid/3f2e1012-0f36-4d48-88f9-3db407e1942b
```

Find one / 查询一条：

```http
GET /demo-database/1
```

Update / 更新：

```http
PATCH /demo-database/1
Content-Type: application/json

{
  "description": "updated demo"
}
```

Update description only / 仅更新描述：

```http
PATCH /demo-database/1/description
Content-Type: application/json

{
  "description": "updated demo"
}
```

Delete / 删除：

```http
DELETE /demo-database/1
```

### Database Wiring / 数据库接线

- `TypeOrmModule.forFeature([Demo])` registers the repository for this feature module.
  `TypeOrmModule.forFeature([Demo])` 为当前 feature module 注册 repository。
- `@InjectRepository(Demo)` injects the TypeORM repository into the service.
  `@InjectRepository(Demo)` 将 TypeORM repository 注入 service。
- `DemoDatabaseService` uses the repository for create, find, update, and delete operations.
  `DemoDatabaseService` 使用 repository 完成创建、查询、更新和删除。
- `createMany()` uses a `QueryRunner` transaction.
  `createMany()` 使用 `QueryRunner` 事务。
- `BulkCreateDemoDto` demonstrates nested DTO validation with `@ValidateNested()` and `@Type()`.
  `BulkCreateDemoDto` 演示使用 `@ValidateNested()` 与 `@Type()` 做嵌套 DTO 校验。

## Demo HTTP / HTTP 客户端示例

Files / 文件：

- `src/platform/infrastructure/http-client/http-client.module.ts`
- `src/platform/infrastructure/http-client/http-client.config.ts`
- `src/examples/demo-http/demo-http.module.ts`
- `src/examples/demo-http/demo-http.controller.ts`
- `src/examples/demo-http/demo-http.service.ts`
- `src/examples/demo-http/dto/*.ts`

Routes / 路由：

```http
GET /demo-http/scenarios
GET /demo-http/provider-status
GET /demo-http/posts?userId=1
GET /demo-http/posts/1
POST /demo-http/posts
Content-Type: application/json

{
  "userId": 1,
  "title": "hello",
  "body": "created through HttpService"
}
```

What it shows / 演示点：

- `CommonHttpClientModule` wraps `@nestjs/axios` and reads default Axios options from `config/config.yaml` via `createHttpModuleOptions`.
  `CommonHttpClientModule` 封装 `@nestjs/axios`，并通过 `createHttpModuleOptions` 从 `config/config.yaml` 读取默认 Axios 配置。
- Controllers keep validation and routing concerns; outbound HTTP calls stay in the service.
  Controller 只负责路由与校验，出站 HTTP 调用集中在 service。
- `HttpService.get<T>()` and `HttpService.post<T>()` demonstrate typed JSON calls against the configured `http.baseUrl` (JSONPlaceholder by default).
  `HttpService.get<T>()` 与 `HttpService.post<T>()` 演示对配置的 `http.baseUrl`（默认 JSONPlaceholder）做带类型的 JSON 调用。
- `ListDemoHttpPostsQueryDto` validates optional list filters on `GET /demo-http/posts`.
  `ListDemoHttpPostsQueryDto` 校验 `GET /demo-http/posts` 的可选列表过滤参数。
- Post and user IDs must be positive safe integers. A params DTO validates
  `GET /demo-http/posts/:id` with the same range.
  Post 与 user ID 必须是正安全整数；params DTO 以相同范围校验
  `GET /demo-http/posts/:id`。
- Request and upstream response contracts require nonblank `title` and `body`;
  their limits are 500 and 10,000 characters respectively.
  请求与上游响应契约都要求 `title`、`body` 非空白，长度上限分别为 500 和
  10,000 个字符。
- `firstValueFrom()` converts `HttpService` Observables into Promise-returning Nest service methods.
  `firstValueFrom()` 将 `HttpService` 返回的 Observable 转成 Nest service 常用的 Promise。
- `axiosRef` is shown for low-level Axios access (`GET /demo-http/provider-status`), while still hidden behind the service boundary.
  `axiosRef` 演示底层 Axios 访问（`GET /demo-http/provider-status`），但仍封装在 service 边界内。
- The provider-status response removes URL userinfo, query parameters, and
  fragments before exposing the configured endpoint as diagnostics.
  provider-status 响应在展示诊断端点前会移除 URL userinfo、query 参数与
  fragment。
- Axios timeout and upstream HTTP failures are translated into Nest exceptions (`GatewayTimeoutException` / `BadGatewayException`).
  Axios 超时与上游 HTTP 失败会转换成 Nest 异常（`GatewayTimeoutException` / `BadGatewayException`）。

## Demo Events / 事件示例

Files / 文件：

- `src/examples/demo-events/demo-events.module.ts`
- `src/examples/demo-events/demo-events.controller.ts`
- `src/examples/demo-events/demo-events.service.ts`
- `src/examples/demo-events/demo-events.listener.ts`
- `src/examples/demo-events/demo-events-log.service.ts`
- `src/examples/demo-events/events/demo-user-registered.event.ts`
- `src/examples/demo-events/events/demo-cache-invalidation-requested.event.ts`

Configuration / 配置：

`src/app.module.ts` registers `EventEmitterModule.forRoot()` with wildcard
support:

```ts
EventEmitterModule.forRoot({
  wildcard: true,
  delimiter: '.',
  maxListeners: 20,
  verboseMemoryLeak: process.env.NODE_ENV !== 'production',
  ignoreErrors: false,
});
```

Routes / 路由：

```http
GET /demo-events
```

```http
POST /demo-events/users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "displayName": "Demo User"
}
```

```http
POST /demo-events/cache/invalidate
Content-Type: application/json

{
  "cacheKey": "demo:user:42",
  "reason": "user profile updated"
}
```

```http
DELETE /demo-events/records
```

What it shows / 演示点：

- Domain events decouple a command from side effects.
  领域事件把主流程和副作用解耦。
- One event can fan out to audit, notification, cache invalidation, and trace
  handlers. 一个事件可以分发到审计、通知、缓存失效和追踪处理器。
- `@OnEvent('demo-events.**')` demonstrates wildcard namespace observation.
  `@OnEvent('demo-events.**')` 演示通配符监听。
- Event payloads are explicit classes instead of anonymous objects.
  事件载荷使用明确 class，而不是匿名对象。
- Registration emails are limited to 254 characters. Display names, cache keys,
  and invalidation reasons must contain non-whitespace text and retain their
  documented field limits.
  注册邮箱最多 254 个字符；显示名、缓存键和失效原因必须包含非空白字符，
  并遵守各字段声明的长度限制。
- The demo keeps only the newest 100 records in memory; production audit logs,
  emails, cache invalidation, and queue handoff should call real infrastructure
  services. 示例只在内存中保留最新 100 条记录；生产审计、邮件、缓存失效和队列转交应调用真实基础设施服务。

## Demo Upload / 文件上传示例

Files / 文件：

- `src/examples/demo-upload/demo-upload.module.ts`
- `src/examples/demo-upload/demo-upload.controller.ts`
- `src/examples/demo-upload/demo-upload.service.ts`
- `src/examples/demo-upload/demo-upload.http.ts`
- `src/examples/demo-upload/demo-upload.storage.ts`
- `src/examples/demo-upload/dto/*.ts`

Routes / 路由：

```http
POST /demo-upload/single
POST /demo-upload/image
POST /demo-upload/files
POST /demo-upload/profile-assets
POST /demo-upload/any
POST /demo-upload/form
```

Chunked upload flow / 分片上传流程：

```http
POST /demo-upload/chunked/sessions
Content-Type: application/json

{
  "originalName": "video.mp4",
  "mimeType": "video/mp4",
  "fileSize": 11534336,
  "chunkSize": 1048576,
  "totalChunks": 11,
  "checksum": "<optional sha256 hex>"
}
```

```http
PUT /demo-upload/chunked/{uploadId}/chunks/{chunkIndex}
Content-Type: multipart/form-data

chunk=<binary chunk>
```

```http
GET /demo-upload/chunked/{uploadId}
POST /demo-upload/chunked/{uploadId}/complete
DELETE /demo-upload/chunked/{uploadId}
```

What it shows / 演示点：

- `demo-upload.controller.ts` declares HTTP routes, parameters, and file fields.
  `demo-upload.controller.ts` 只声明 HTTP 路由、参数和文件字段。
- `demo-upload.http.ts` owns Multer limits and `ParseFilePipeBuilder` file
  validation. `demo-upload.http.ts` 负责 Multer 限制和
  `ParseFilePipeBuilder` 文件校验。
- File routes accept at most 3 one-MiB file parts and reject text fields.
  The form-only route accepts at most 20 text fields of 64 KiB each; every
  multipart route also has an explicit total-part limit.
- Every uploaded `originalName`, including chunk parts, must contain
  non-whitespace text and is limited to 120 characters. Chunked-session
  `originalName` follows the same rule; an optional checksum is exactly 64
  lowercase hexadecimal SHA-256 characters.
  所有上传文件（含分片）的 `originalName` 必须包含非空白字符且最多 120 个字符；
  分片会话的 `originalName` 使用相同规则，可选 checksum 必须是 64 位小写
  十六进制 SHA-256。
- `demo-upload.service.ts` owns upload session rules: chunk count, chunk size,
  missing chunks, final size, and optional SHA-256 checksum. `service` 负责上传
  会话规则：分片数量、分片大小、缺失分片、最终大小和可选 SHA-256 校验。
- `demo-upload.storage.ts` owns the temporary filesystem strategy for chunk files
  and assembled demo files. `storage` 负责临时分片文件和合并后示例文件的文件系统策略。
- Active and completed uploads have 15-minute TTLs; clients can cancel uploads.
  A process accepts at most 25 active sessions and 100 MiB of reserved upload
  bytes. Per-upload sequencing closes finalize/cancel/chunk races, while
  per-process leases remove abandoned instance directories after the orphan
  retention window.
- Temporary base, instance, and upload directories are forced to mode `0700`;
  lease, chunk, staging, and completed files are forced to `0600` independently
  of the process umask.
- Session metadata remains in process memory and files remain on one instance's
  temporary disk. Multi-instance routing, durable metadata/object storage,
  distributed leases, authorization, and production quota policy remain
  application responsibilities.
- In the full application, all unsafe methods are protected by global CSRF
  middleware. Use the README cookie-jar/token recipe. 完整应用中的所有非安全
  HTTP 方法都经过全局 CSRF 防护，请使用 README 的 cookie-jar/token 流程。

## Demo Streaming Files / 文件流响应示例

Files / 文件：

- `src/examples/demo-streaming-files/demo-streaming-files.module.ts`
- `src/examples/demo-streaming-files/demo-streaming-files.controller.ts`
- `src/examples/demo-streaming-files/demo-streaming-files.service.ts`
- `src/examples/demo-streaming-files/demo-streaming-files.http.ts`
- `src/examples/demo-streaming-files/demo-streaming-files.types.ts`
- `src/examples/demo-streaming-files/dto/*.ts`

Routes / 路由：

```http
GET /demo-streaming-files
GET /demo-streaming-files/project/package-json
GET /demo-streaming-files/project/readme
GET /demo-streaming-files/generated/report.csv
GET /demo-streaming-files/generated/note.txt
```

What it shows / 演示点：

- `demo-streaming-files.service.ts` describes the file source, safe path
  resolution, content type, filename, length, and inline/attachment mode.
  `service` 描述文件来源、安全路径解析、内容类型、文件名、长度和 inline/attachment 模式。
- `demo-streaming-files.http.ts` adapts that file description to NestJS
  `StreamableFile` and HTTP `Content-Disposition`. `http` 文件把文件描述适配成
  NestJS `StreamableFile` 和 HTTP `Content-Disposition`。
- The controller delegates to the service and HTTP adapter; it does not create
  file streams or compose response headers itself. controller 只委托 service 和 HTTP
  adapter，不直接创建文件流或拼响应头。

## Demo Authorization / 授权端到端示例

Prerequisites / 前置条件：

- Start the development app with MySQL and Redis available.
- Keep `CSRF_ENABLED=true`; install `jq` for the shell examples.
- The built-in user is `admin@example.com` / `admin12345`.

Login and call the role-, permission-, and policy-protected APIs:

```bash
COOKIE_JAR="$(mktemp)"
TOKEN_RESPONSE="$(curl -fsS -c "$COOKIE_JAR" http://localhost:3000/demo-csrf/token)"
CSRF_TOKEN="$(printf '%s' "$TOKEN_RESPONSE" | jq -r .csrfToken)"
LOGIN_RESPONSE="$(curl -fsS -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H 'content-type: application/json' \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -d '{"username":"admin@example.com","password":"admin12345"}' \
  http://localhost:3000/demo-auth/login)"
ACCESS_TOKEN="$(printf '%s' "$LOGIN_RESPONSE" | jq -r .accessToken)"

curl -fsS -H "authorization: Bearer $ACCESS_TOKEN" \
  http://localhost:3000/demo-authorization/admin-report
curl -fsS -H "authorization: Bearer $ACCESS_TOKEN" \
  http://localhost:3000/demo-authorization/audit-log
curl -fsS -H "authorization: Bearer $ACCESS_TOKEN" \
  http://localhost:3000/demo-authorization/users/demo-admin/profile
```

Expected / 预期：the report identifies `demo-admin`, the audit response contains
`demo.authorization.checked`, and the profile has `self-or-admin` visibility.
Without a bearer token the protected routes return `401`; an authenticated
identity that lacks the required role, permission, or ownership policy returns
`403`. Invalid login credentials return `401`, and repeated failures can return
`429`.

## Demo Cookies / Cookie 端到端示例

Prerequisites / 前置条件：start the development app with CSRF enabled. Reuse a
single cookie jar so the CSRF identifier and demo cookie survive between calls.

```bash
COOKIE_JAR="$(mktemp)"
TOKEN_RESPONSE="$(curl -fsS -c "$COOKIE_JAR" http://localhost:3000/demo-csrf/token)"
CSRF_TOKEN="$(printf '%s' "$TOKEN_RESPONSE" | jq -r .csrfToken)"

curl -fsS -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H 'content-type: application/json' \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -d '{"theme":"dark","locale":"zh-CN"}' \
  http://localhost:3000/demo-cookies/preferences
curl -fsS -b "$COOKIE_JAR" \
  http://localhost:3000/demo-cookies/demo_preferences
```

Expected / 预期：the mutation returns `name: demo_preferences` and the read
returns `found: true` with the stored JSON value. Omitting the CSRF header or
identifier cookies returns `403`. `POST /demo-cookies/session` additionally
requires `COOKIE_SECRET`; without it the route returns `503`.
Cookie-derived GET responses set `Cache-Control: private, no-store`.

## Demo CORS / CORS 端到端示例

Prerequisites / 前置条件：restart development with
`CORS_ORIGINS=http://localhost:5173`, `CORS_CREDENTIALS=true`, and
`CORS_EXPOSED_HEADERS=X-Demo-Cors-Trace`.

```bash
curl -i -H 'Origin: http://localhost:5173' \
  http://localhost:3000/demo-cors/public-resource

curl -i -X OPTIONS \
  -H 'Origin: http://localhost:5173' \
  -H 'Access-Control-Request-Method: GET' \
  http://localhost:3000/demo-cors/credentialed-resource
```

Expected / 预期：the GET includes
`Access-Control-Allow-Origin: http://localhost:5173`,
`Access-Control-Allow-Credentials: true`, and exposes
`X-Demo-Cors-Trace`; the preflight returns the configured success status and
methods. A request from an origin outside the allow-list receives no matching
allow-origin header. Startup rejects wildcard origins combined with
credentials. Socket.IO inherits this same validated policy.
The credentialed resource also sets `Cache-Control: private, no-store` because
`hasSession` is browser-specific.

## Demo Session / Session 端到端示例

Prerequisites / 前置条件：development only, with `SESSION_ENABLED=true`,
`SESSION_SECRET` set, and CSRF enabled. The built-in MemoryStore is deliberately
rejected in production.

```bash
COOKIE_JAR="$(mktemp)"
TOKEN_RESPONSE="$(curl -fsS -c "$COOKIE_JAR" http://localhost:3000/demo-csrf/token)"
CSRF_TOKEN="$(printf '%s' "$TOKEN_RESPONSE" | jq -r .csrfToken)"

curl -fsS -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H 'content-type: application/json' \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -d '{"userId":"demo-user","displayName":"Demo User","role":"member"}' \
  http://localhost:3000/demo-session/login
curl -fsS -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -X POST http://localhost:3000/demo-session/visits
curl -fsS -b "$COOKIE_JAR" http://localhost:3000/demo-session
```

Expected / 预期：the same session cookie preserves the user and increments the
visit count. Flash and cart routes follow the same cookie/CSRF pattern. Without
the session cookie a new anonymous state is created; with
`SESSION_ENABLED=false`, session-dependent routes return `503`; missing CSRF
returns `403`.
Session status, flash, and cart GET responses set
`Cache-Control: private, no-store`.
Login display names and flash messages must contain non-whitespace text. Cart
item `:sku` paths use the same 1–64 character `[a-zA-Z0-9:_-]+` contract as
cart request bodies. Session rotation on anonymous login preserves the bounded
anonymous cart, visit counter, and unread flash queue. Each session accepts at
most 20 unread flash messages and 50 distinct cart SKUs, with a cumulative
quantity of at most 99 per SKU; attempts beyond those limits return `409`
without partially changing the session.
登录显示名与 flash 消息必须包含非空白字符；购物车 `:sku` 路径与请求体使用相同的
1–64 位 `[a-zA-Z0-9:_-]+` 契约。匿名登录时的 session 轮换会保留有界的匿名购物车、
访问计数和未读 flash 队列。每个 session 最多保存 20 条未读 flash、50 个不同 SKU，
每个 SKU 的累计数量最多为 99；超出限制返回 `409`，且不会部分修改 session。

## Demo SSE / SSE 端到端示例

Prerequisites / 前置条件：start the development app and use a client that does
not buffer the response.

```bash
curl -N http://localhost:3000/demo-sse/job-progress
```

Expected / 预期：the finite stream emits named `job.progress` events with stable
IDs and progress from `0` through `100`, then closes. Browsers can use:

```js
const stream = new EventSource('http://localhost:3000/demo-sse/notifications');
stream.addEventListener('notification', (event) => {
  const notification = JSON.parse(event.data);
  document.title = notification.title;
});
stream.onerror = () => {
  // EventSource reconnects using the server-provided retry value.
};
```

The endpoints set
`Cache-Control: private, no-cache, no-store, must-revalidate, max-age=0, no-transform`
and `X-Accel-Buffering: no`. Unknown SSE routes return `404`; a disconnected
client triggers stream finalization. Production proxies must preserve streaming
and disable response buffering/compression for `text/event-stream`.

The repeating notification, activity, metrics, and heartbeat examples close
after 100 events per connection. This bounds server-side backlog for slow
clients; browser `EventSource` reconnects using the advertised retry delay.
通知、活动、指标与心跳示例在每个连接发送 100 个事件后关闭，以限制慢客户端造成的
服务端积压；浏览器 `EventSource` 会按流中声明的重试间隔重新连接。

The demo streams are cold and connection-local: each new
`/demo-sse/activity-feed` connection starts again at `activity-0`. These IDs are
stable only within that connection; the demo does not persist events or replay
from `Last-Event-ID`. Use a shared durable event store and an explicit replay
cursor when production clients require resume semantics.

示例流是冷流且仅属于当前连接：每次新建 `/demo-sse/activity-feed` 连接都会从
`activity-0` 重新开始。ID 只在单次连接内稳定；示例不会持久化事件，也不会按
`Last-Event-ID` 重放。生产环境若需要断线续传，应使用共享持久事件存储和明确的重放游标。

## Verify / 验证

Run the normal checks after changing demo behavior:

修改 demo 行为后运行常规检查：

```bash
pnpm run format
pnpm run lint
pnpm run test
pnpm run build
```
