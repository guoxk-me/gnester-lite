# Project Notes / 项目备注

This file gives a concise bilingual map of what each major part does and why
it exists.

本文用简洁的中英双语说明项目主要部分“做什么”和“为什么存在”。

## Root / 根目录

- `src/main.ts`: Creates the NestJS app, delegates application configuration, and starts listening. / 创建 NestJS 应用、委托应用配置并启动监听。
- `src/instrument.ts`: Initializes Sentry before any Nest modules load. / 在任何 Nest 模块加载前初始化 Sentry。
- `src/app.module.ts`: Acts as the application composition root for global configuration, the TypeORM root connection, always-on platform modules, and the non-production demo catalog. / 作为应用唯一装配根，组合全局配置、TypeORM 根连接、常驻平台模块与非生产环境的 Demo 目录。
- `src/migrations/`: Contains application migrations that the production data source may discover. / 保存生产数据源可以发现的应用迁移。
- `config/`: Loads YAML/env configuration, validates runtime settings, and provides TypeORM CLI config. / 加载 YAML/env 配置、校验运行参数，并提供 TypeORM CLI 配置。
- `docs/`: Explains each template capability so code examples have operational context. / 说明各模板能力，让代码示例有可运行、可维护的上下文。
- `test/`: Holds e2e tests for API wiring and cross-module behavior. / 存放端到端测试，验证接口装配和跨模块行为。

## Bootstrap / 启动与接入

- `src/bootstrap/configure-application.ts`: Applies the order-sensitive HTTP middleware, CSRF, validation, versioning, documentation, and Socket.IO pipeline. / 按顺序挂载 HTTP 中间件、CSRF、校验、版本化、文档与 Socket.IO 管线。
- `src/bootstrap/application-shutdown.ts`: Coordinates readiness drain, HTTP shutdown, Nest cleanup, and telemetry close budgets. / 编排就绪状态下线、HTTP 排空、Nest 清理与遥测关闭预算。
- `src/bootstrap/http/cors.config.ts`: Builds validated environment-specific CORS options. / 根据已校验配置生成环境相关 CORS 策略。
- `src/bootstrap/http/helmet-options.ts`: Owns Helmet and security-header bootstrap policy. / 维护 Helmet 与安全响应头启动策略。
- `src/bootstrap/http/validation.pipe.ts`: Defines the global HTTP request validation and sanitized error contract. / 定义全局 HTTP 请求校验与脱敏错误契约。
- `src/bootstrap/http/openapi.config.ts`: Configures development OpenAPI metadata and UI. / 配置开发环境的 OpenAPI 元数据与 UI。
- `src/bootstrap/http/socket-io.adapter.ts`: Applies the validated origin policy to Socket.IO. / 将已校验的来源策略应用到 Socket.IO。

## Platform / 平台能力

Platform modules are explicit dependencies: a consumer imports the module that exports the provider it injects. They are grouped by runtime responsibility and never import Feature implementations. / 平台模块采用显式依赖：消费者必须导入其所注入 provider 的所属模块。平台按运行职责分类，且不得反向依赖 Feature 实现。

### Infrastructure / 基础设施

- `src/platform/infrastructure/cache`: Wraps Redis cache access and HTTP cache interception. See `docs/cache.md`. / 封装 Redis 缓存访问和 HTTP 缓存拦截。详见 `docs/cache.md`。
- `src/platform/infrastructure/http-client`: Centralizes optional outbound HTTP client configuration. See the Demo HTTP section in `docs/demo.md`. / 集中管理可选的外部 HTTP 客户端配置。详见 `docs/demo.md` 的 Demo HTTP 章节。
- `src/platform/infrastructure/queue`: Provides BullMQ connection policy and shared queue operations. See `docs/queue.md`. / 提供 BullMQ 连接策略与共享队列操作。详见 `docs/queue.md`。

### Runtime / 运行时

- `src/platform/runtime/schedule`: Owns scheduler registration, runtime job visibility, and shutdown cleanup. See `docs/schedule.md`. / 负责调度器注册、运行时任务可见性与关停清理。详见 `docs/schedule.md`。

### Observability / 可观测性

- `src/platform/observability/logger`: Wraps `nestjs-pino` for structured logs and HTTP access logging. See `docs/logger.md`. / 封装 `nestjs-pino`，提供结构化日志与 HTTP 访问日志。详见 `docs/logger.md`。
- `src/platform/observability/sentry`: Owns Sentry module registration, privacy policy, background isolation, and telemetry shutdown. See `docs/sentry.md`. / 负责 Sentry 模块注册、隐私策略、后台任务隔离和遥测关闭。详见 `docs/sentry.md`。

### Operations / 运维能力

- `src/platform/operations/health`: Exposes liveness/readiness checks and bounded dependency diagnostics. See `docs/health.md`. / 提供存活、就绪探针与有界依赖诊断。详见 `docs/health.md`。

### Security / 安全能力

- `src/platform/security/auth`: Issues and verifies JWTs, hashes passwords, and protects routes. / 签发与校验 JWT、处理密码哈希，并保护接口。
- `src/platform/security/authorization`: Provides role, permission, and policy guards. / 提供角色、权限和策略守卫。
- `src/platform/security/crypto`: Provides HMAC signing, secure token generation, and symmetric encryption. / 提供 HMAC 签名、安全令牌生成和对称加密。
- `src/platform/security/csrf`: Creates CSRF protection middleware and error handling. / 创建 CSRF 防护中间件和错误处理。
- `src/platform/security/rate-limit`: Configures application-wide HTTP request throttling. / 配置应用级 HTTP 请求限流。

See `docs/security.md` for the security capability details. / 安全能力细节见 `docs/security.md`。

## Contracts / 共享契约

- `src/contracts/`: Contains only stable, framework-free TypeScript values shared across owners. It must not contain NestJS DTOs or depend on bootstrap, platform, or features. / 只保存跨所有者共享、稳定且无框架依赖的 TypeScript 类型或常量；不得放置 NestJS DTO，也不得依赖 bootstrap、platform 或 features。

## Composition Rules / 装配规则

- Platform capability modules are not global. Every consumer declares the capability module it injects in its own Nest `imports`. / 平台能力模块不是全局模块；每个消费者都必须在自己的 Nest `imports` 中声明所注入的能力模块。
- `ConfigModule.forRoot({ isGlobal: true })` is the deliberate configuration exception registered once by `AppModule`. / `ConfigModule.forRoot({ isGlobal: true })` 是配置层的明确例外，只由 `AppModule` 注册一次。
- `TypeOrmModule.forRootAsync(...)` is the application-level database root registration; repository-owning features still use `TypeOrmModule.forFeature(...)`. / `TypeOrmModule.forRootAsync(...)` 是应用级数据库根注册；拥有 Repository 的 Feature 仍需使用 `TypeOrmModule.forFeature(...)`。
- Application-wide `APP_GUARD` and `APP_FILTER` behavior remains owned by explicitly imported rate-limit and Sentry modules. / 应用级 `APP_GUARD` 与 `APP_FILTER` 行为仍由显式导入的限流和 Sentry 模块负责。
- `DemosModule` is omitted from production, while optional platform infrastructure is imported by the Feature that consumes it. / 生产环境不装配 `DemosModule`；可选平台基础设施由实际消费它的 Feature 导入。
- Demo database migration discovery is opt-in by environment: `development`, `test`, and guarded `provision` include `src/examples/demo-database/migrations/`, while `production` excludes it. Existing production Demo tables are not automatically removed. / Demo 数据库迁移按环境启用：`development`、`test` 和受安全门保护的 `provision` 会包含 `src/examples/demo-database/migrations/`，`production` 则排除；已有生产 Demo 表不会被自动删除。

## Feature Modules / 功能示例模块

- `demo-auth`: Shows sign-in and token issuance flow. / 演示登录和令牌签发流程。
- `demo-authorization`: Shows role, permission, and policy-protected endpoints. / 演示角色、权限和策略保护接口。
- `demo-cache`: Shows cache reads, writes, updates, and invalidation. / 演示缓存读取、写入、更新和失效。
- `demo-config`: Shows typed configuration access. / 演示类型化配置读取。
- `demo-cookies`: Shows reading and writing signed/regular cookies. / 演示读取和写入签名或普通 Cookie。
- `demo-cors`: Shows CORS scenarios and allowed resource behavior. / 演示跨域场景和资源访问策略。
- `demo-crypto`: Shows encryption, one-time tokens, and webhook signatures. / 演示加密、一次性令牌和 Webhook 签名。
- `demo-csrf`: Shows CSRF token issuance and protected form-style actions. / 演示 CSRF 令牌签发和受保护表单操作。
- `demo-database`: Owns its entity and non-production migration, and shows TypeORM CRUD, pagination, bulk create, and DTO mapping. / 拥有自己的实体与非生产迁移，并演示 TypeORM CRUD、分页、批量创建和 DTO 映射。
- `demo-events`: Shows event publishing, listeners, and audit-style logs. / 演示事件发布、监听器和审计式日志。
- `demo-http`: Shows outbound HTTP provider calls and query DTOs. / 演示外部 HTTP 调用和查询 DTO。
- `demo-queue`: Shows background job creation, processing, status, and counts. / 演示后台任务创建、处理、状态和数量统计。
- `demo-rate-limit`: Shows throttled routes and rate-limit scenarios. / 演示限流接口和限流场景。
- `demo-schedule`: Shows scheduled jobs plus manual pause/resume/run controls. / 演示定时任务以及手动暂停、恢复和运行控制。
- `demo-security`: Shows security headers and middleware effects. / 演示安全响应头和中间件效果。
- `demo-sentry`: Shows Sentry status checks and a deliberate debug error. See `docs/sentry.md`. / 演示 Sentry 状态查询与故意触发的调试错误。详见 `docs/sentry.md`。
- `demo-serialization`: Shows response shaping with class serialization. / 演示使用类序列化整理响应结构。
- `demo-session`: Shows server-side session state and flash/cart examples. / 演示服务端会话状态、闪存消息和购物车示例。
- `demo-sse`: Shows server-sent event streaming. / 演示服务端事件流。
- `demo-streaming-files`: Shows streamed file sources with a separate HTTP response adapter. / 演示文件流来源，并把 HTTP 响应适配单独隔离。
- `demo-upload`: Shows multipart uploads, file validation, chunked upload sessions, and temporary storage boundaries. / 演示 multipart 上传、文件校验、分片上传会话和临时存储边界。
- `demo-websocket`: Shows authenticated Socket.IO rooms, validation, errors, response shaping, and owns its AsyncAPI JSON/YAML contract. / 演示认证 Socket.IO 房间、校验、错误、响应整形，并维护自身的 AsyncAPI JSON/YAML 契约。

## File Patterns / 文件模式

- `*.module.ts`: Declares NestJS dependency boundaries. / 声明 NestJS 依赖边界。
- `*.controller.ts`: Defines HTTP endpoints and request/response contracts. / 定义 HTTP 接口和请求响应契约。
- `*.service.ts`: Holds business logic or reusable runtime operations. / 承载业务逻辑或可复用运行操作。
- `dto/*.dto.ts`: Defines validated input/output data shapes. / 定义经过校验的输入输出数据结构。
- `entities/*.ts`: Defines database tables mapped by TypeORM. / 定义 TypeORM 映射的数据表。
- `migrations/*.ts`: Defines schema history owned by the application or Feature whose data it creates. / 定义由创建该数据的应用或 Feature 所拥有的 schema 历史。
- `*.spec.ts`: Protects behavior contracts with deterministic unit tests. / 用确定性单元测试保护行为契约。
- `*.e2e-spec.ts`: Verifies app wiring through real HTTP/WebSocket flows. / 通过真实 HTTP/WebSocket 流程验证应用装配。
