# Demo Guide / 示例指南

> CN: 文档文件，说明 demo 的用途；EN: Documentation file explains the purpose of demo.

This document records the demo feature modules under `src/features/`.

本文档记录 `src/features/` 下的 demo 示例模块，方便开发者和 AI agent 快速理解这些示例在演示什么。

## Runtime Setup / 运行入口

`src/features/demos.module.ts` aggregates the removable demo catalog, and
`src/app.module.ts` imports that catalog once. The complete `DemoQueueModule`
(routes, providers, and workers) is omitted when `NODE_ENV=test`. See
`docs/project-notes.zh-en.md` for the complete module list.

`src/features/demos.module.ts` 聚合可整体移除的示例目录，根模块只导入一次；
`NODE_ENV=test` 时不加载整个 `DemoQueueModule`（路由、provider 与 worker）。
完整模块清单见
`docs/project-notes.zh-en.md`。

The database demo intentionally focuses on database scenarios only. It does not demonstrate API versioning, interceptors, cache, or scheduled jobs.

数据库 demo 只关注数据库场景，不演示接口版本、拦截器、缓存或定时任务。

## Demo Config / 配置示例

Files / 文件：

- `src/features/demo-config/demo-config.module.ts`
- `src/features/demo-config/demo-config.controller.ts`
- `src/features/demo-config/demo-config.service.ts`

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

- `src/common/auth/auth.module.ts`
- `src/common/auth/auth.guard.ts`
- `src/common/auth/guards/local-auth.guard.ts`
- `src/common/auth/guards/jwt-auth.guard.ts`
- `src/common/auth/strategies/jwt.strategy.ts`
- `src/common/auth/decorators/public.decorator.ts`
- `src/common/auth/decorators/current-user.decorator.ts`
- `src/features/demo-auth/demo-auth.module.ts`
- `src/features/demo-auth/demo-auth.controller.ts`
- `src/features/demo-auth/demo-auth.service.ts`
- `src/features/demo-auth/local.strategy.ts`

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
- `@Public()` marks login and scenario routes as public.
  `@Public()` 标记登录和场景说明路由为公开接口。
- `@CurrentUser()` exposes the verified JWT payload to controllers.
  `@CurrentUser()` 将已校验的 JWT payload 暴露给 controller。
- Passwords are verified with salted hashes, not plaintext comparison.
  密码使用加盐哈希校验，不做明文比较。

## Demo Security / 安全响应头示例

Files / 文件：

- `src/common/security/helmet-options.ts`
- `src/bootstrap/configure-application.ts`
- `src/features/demo-security/demo-security.module.ts`
- `src/features/demo-security/demo-security.controller.ts`
- `src/features/demo-security/demo-security.service.ts`
- `src/features/demo-security/dto/*.ts`

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
- `src/common/sentry/sentry.module.ts`
- `src/common/sentry/with-sentry-isolation.ts`
- `src/features/demo-sentry/demo-sentry.module.ts`
- `src/features/demo-sentry/demo-sentry.controller.ts`
- `src/features/demo-sentry/demo-sentry.service.ts`
- `src/features/demo-sentry/dto/*.ts`
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

- `src/common/csrf/csrf.module.ts`
- `src/common/csrf/csrf.service.ts`
- `src/features/demo-csrf/demo-csrf.module.ts`
- `src/features/demo-csrf/demo-csrf.controller.ts`
- `src/features/demo-csrf/demo-csrf.service.ts`
- `src/features/demo-csrf/dto/*.ts`

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
- Missing or invalid tokens return a stable `CSRF_TOKEN_INVALID` 403 response.
  token 缺失或无效时返回稳定的 `CSRF_TOKEN_INVALID` 403 响应。
- The overview endpoint documents when CSRF is needed and when bearer-token APIs
  usually do not need it. overview 接口说明哪些场景需要 CSRF，以及为什么纯 bearer-token API 通常不需要。

## Demo Crypto / 加密与哈希示例

Files / 文件：

- `src/common/crypto/crypto.module.ts`
- `src/common/crypto/symmetric-encryption.service.ts`
- `src/common/crypto/secure-token.service.ts`
- `src/common/crypto/hmac-signature.service.ts`
- `src/features/demo-crypto/demo-crypto.module.ts`
- `src/features/demo-crypto/demo-crypto.controller.ts`
- `src/features/demo-crypto/demo-crypto.service.ts`

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

- `src/features/demo-database/demo-database.module.ts`
- `src/features/demo-database/demo-database.controller.ts`
- `src/features/demo-database/demo-database.service.ts`
- `src/features/demo-database/entities/demo.entity.ts`
- `src/features/demo-database/dto/bulk-create-demo.dto.ts`
- `src/features/demo-database/dto/create-demo.dto.ts`
- `src/features/demo-database/dto/demo-mapped-types.dto.ts`
- `src/features/demo-database/dto/find-demo-params.dto.ts`
- `src/features/demo-database/dto/list-demo-query.dto.ts`
- `src/features/demo-database/dto/update-demo.dto.ts`

Entity / 实体：

```ts
Demo {
  id: number;
  name: string;
  description: string;
}
```

`name` has max length `20`; `description` is required.

`name` 最大长度为 `20`；`description` 为必填。

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

Find page / 分页查询：

```http
GET /demo-database/page?page=1&limit=10&order=ASC
```

Find by ids / 按 ID 批量查询：

```http
GET /demo-database/by-ids?ids=1,2,3
```

Search by name / 按名称搜索：

```http
GET /demo-database/search?keyword=hello
```

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

- `src/common/http-client/http-client.module.ts`
- `src/common/http-client/http-client.config.ts`
- `src/features/demo-http/demo-http.module.ts`
- `src/features/demo-http/demo-http.controller.ts`
- `src/features/demo-http/demo-http.service.ts`
- `src/features/demo-http/dto/*.ts`

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
- `ParseIntPipe` parses `GET /demo-http/posts/:id` path params.
  `ParseIntPipe` 解析 `GET /demo-http/posts/:id` 路径参数。
- `firstValueFrom()` converts `HttpService` Observables into Promise-returning Nest service methods.
  `firstValueFrom()` 将 `HttpService` 返回的 Observable 转成 Nest service 常用的 Promise。
- `axiosRef` is shown for low-level Axios access (`GET /demo-http/provider-status`), while still hidden behind the service boundary.
  `axiosRef` 演示底层 Axios 访问（`GET /demo-http/provider-status`），但仍封装在 service 边界内。
- Axios timeout and upstream HTTP failures are translated into Nest exceptions (`GatewayTimeoutException` / `BadGatewayException`).
  Axios 超时与上游 HTTP 失败会转换成 Nest 异常（`GatewayTimeoutException` / `BadGatewayException`）。

## Demo Events / 事件示例

Files / 文件：

- `src/features/demo-events/demo-events.module.ts`
- `src/features/demo-events/demo-events.controller.ts`
- `src/features/demo-events/demo-events.service.ts`
- `src/features/demo-events/demo-events.listener.ts`
- `src/features/demo-events/demo-events-log.service.ts`
- `src/features/demo-events/events/demo-user-registered.event.ts`
- `src/features/demo-events/events/demo-cache-invalidation-requested.event.ts`

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
- The demo stores records in memory only; production audit logs, emails, cache
  invalidation, and queue handoff should call real infrastructure services.
  示例只把记录存在内存里；生产审计、邮件、缓存失效和队列转交应调用真实基础设施服务。

## Demo Upload / 文件上传示例

Files / 文件：

- `src/features/demo-upload/demo-upload.module.ts`
- `src/features/demo-upload/demo-upload.controller.ts`
- `src/features/demo-upload/demo-upload.service.ts`
- `src/features/demo-upload/demo-upload.http.ts`
- `src/features/demo-upload/demo-upload.storage.ts`
- `src/features/demo-upload/dto/*.ts`

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
```

What it shows / 演示点：

- `demo-upload.controller.ts` declares HTTP routes, parameters, and file fields.
  `demo-upload.controller.ts` 只声明 HTTP 路由、参数和文件字段。
- `demo-upload.http.ts` owns Multer limits and `ParseFilePipeBuilder` file
  validation. `demo-upload.http.ts` 负责 Multer 限制和
  `ParseFilePipeBuilder` 文件校验。
- `demo-upload.service.ts` owns upload session rules: chunk count, chunk size,
  missing chunks, final size, and optional SHA-256 checksum. `service` 负责上传
  会话规则：分片数量、分片大小、缺失分片、最终大小和可选 SHA-256 校验。
- `demo-upload.storage.ts` owns the temporary filesystem strategy for chunk files
  and assembled demo files. `storage` 负责临时分片文件和合并后示例文件的文件系统策略。
- The demo stores chunk sessions in memory and writes files under the OS temp
  directory. Production systems should use durable metadata storage, object
  storage, lifecycle cleanup, authorization, and quota enforcement. 示例把分片会话存在
  内存里，并写入系统临时目录；生产系统应使用持久元数据、对象存储、生命周期清理、授权和配额控制。
- In the full application, unsafe POST/PUT requests are protected by global CSRF
  middleware. Fetch `GET /demo-csrf/token` first for browser cookie/session
  clients. 在完整应用中，POST/PUT 会经过全局 CSRF 防护；浏览器 cookie/session
  客户端应先请求 `GET /demo-csrf/token`。

## Demo Streaming Files / 文件流响应示例

Files / 文件：

- `src/features/demo-streaming-files/demo-streaming-files.module.ts`
- `src/features/demo-streaming-files/demo-streaming-files.controller.ts`
- `src/features/demo-streaming-files/demo-streaming-files.service.ts`
- `src/features/demo-streaming-files/demo-streaming-files.http.ts`
- `src/features/demo-streaming-files/demo-streaming-files.types.ts`
- `src/features/demo-streaming-files/dto/*.ts`

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

## Verify / 验证

Run the normal checks after changing demo behavior:

修改 demo 行为后运行常规检查：

```bash
pnpm run format
pnpm run lint
pnpm run test
pnpm run build
```
