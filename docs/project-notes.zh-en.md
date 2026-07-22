# Project Notes / 项目备注

> CN: 文档文件，说明 project notes.zh en 的用途；EN: Documentation file explains the purpose of project notes.zh en.

This file gives a concise bilingual map of what each major part does and why
it exists.

本文用简洁的中英双语说明项目主要部分“做什么”和“为什么存在”。

## Root / 根目录

- `src/main.ts`: Bootstraps the NestJS app, applies global middleware, validation, API versioning, OpenAPI, CSRF, sessions, and WebSocket adapter. / 启动 NestJS 应用并挂载全局中间件、校验、接口版本、OpenAPI、CSRF、会话和 WebSocket 适配器。
- `src/app.module.ts`: Wires configuration, database, Redis cache, BullMQ queues, events, schedules, common modules, and demo features. / 装配配置、数据库、Redis 缓存、BullMQ 队列、事件、定时任务、公共模块和示例功能。
- `config/`: Loads YAML/env configuration, validates runtime settings, and provides TypeORM CLI config. / 加载 YAML/env 配置、校验运行参数，并提供 TypeORM CLI 配置。
- `docs/`: Explains each template capability so code examples have operational context. / 说明各模板能力，让代码示例有可运行、可维护的上下文。
- `test/`: Holds e2e tests for API wiring and cross-module behavior. / 存放端到端测试，验证接口装配和跨模块行为。

## Common Modules / 公共模块

- `common/auth`: Issues/verifies JWTs, hashes passwords, and protects routes. / 签发与校验 JWT、处理密码哈希，并保护接口。
- `common/authorization`: Provides role, permission, and policy guards. / 提供角色、权限和策略守卫。
- `common/cache`: Wraps cache access and HTTP cache interception. / 封装缓存访问和 HTTP 缓存拦截。
- `common/cors`: Builds CORS options from environment-specific config. / 根据环境配置生成跨域策略。
- `common/crypto`: Provides HMAC signing, secure token generation, and symmetric encryption. / 提供 HMAC 签名、安全令牌生成和对称加密。
- `common/csrf`: Creates CSRF protection middleware and error handling. / 创建 CSRF 防护中间件和错误处理。
- `common/health`: Exposes liveness/readiness checks for deployment probes. / 提供存活和就绪检查，服务部署探针使用。
- `common/http-client`: Centralizes outbound HTTP client configuration. / 集中管理外部 HTTP 请求客户端配置。
- `common/openapi`: Configures Swagger/OpenAPI outside production. / 在非生产环境配置 Swagger/OpenAPI 文档。
- `common/queue`: Gives shared queue helper functions for BullMQ features. / 为 BullMQ 功能提供共享队列辅助能力。
- `common/rate-limit`: Configures request throttling to reduce abuse. / 配置请求限流，降低滥用风险。
- `common/schedule`: Exposes runtime schedule/job visibility. / 暴露运行时定时任务和作业状态。
- `common/security`: Applies Helmet and security headers. / 应用 Helmet 和安全响应头。
- `common/validation`: Defines the global request validation pipe. / 定义全局请求校验管道。
- `common/websocket`: Customizes Socket.IO behavior for the demo gateway. / 为示例网关定制 Socket.IO 行为。

## Feature Modules / 功能示例模块

- `demo-auth`: Shows sign-in and token issuance flow. / 演示登录和令牌签发流程。
- `demo-authorization`: Shows role, permission, and policy-protected endpoints. / 演示角色、权限和策略保护接口。
- `demo-cache`: Shows cache reads, writes, updates, and invalidation. / 演示缓存读取、写入、更新和失效。
- `demo-config`: Shows typed configuration access. / 演示类型化配置读取。
- `demo-cookies`: Shows reading and writing signed/regular cookies. / 演示读取和写入签名或普通 Cookie。
- `demo-cors`: Shows CORS scenarios and allowed resource behavior. / 演示跨域场景和资源访问策略。
- `demo-crypto`: Shows encryption, one-time tokens, and webhook signatures. / 演示加密、一次性令牌和 Webhook 签名。
- `demo-csrf`: Shows CSRF token issuance and protected form-style actions. / 演示 CSRF 令牌签发和受保护表单操作。
- `demo-database`: Shows TypeORM entity CRUD, pagination, bulk create, and DTO mapping. / 演示 TypeORM 实体 CRUD、分页、批量创建和 DTO 映射。
- `demo-events`: Shows event publishing, listeners, and audit-style logs. / 演示事件发布、监听器和审计式日志。
- `demo-http`: Shows outbound HTTP provider calls and query DTOs. / 演示外部 HTTP 调用和查询 DTO。
- `demo-queue`: Shows background job creation, processing, status, and counts. / 演示后台任务创建、处理、状态和数量统计。
- `demo-rate-limit`: Shows throttled routes and rate-limit scenarios. / 演示限流接口和限流场景。
- `demo-schedule`: Shows scheduled jobs plus manual pause/resume/run controls. / 演示定时任务以及手动暂停、恢复和运行控制。
- `demo-security`: Shows security headers and middleware effects. / 演示安全响应头和中间件效果。
- `demo-serialization`: Shows response shaping with class serialization. / 演示使用类序列化整理响应结构。
- `demo-session`: Shows server-side session state and flash/cart examples. / 演示服务端会话状态、闪存消息和购物车示例。
- `demo-sse`: Shows server-sent event streaming. / 演示服务端事件流。
- `demo-streaming-files`: Shows streamed file sources with a separate HTTP response adapter. / 演示文件流来源，并把 HTTP 响应适配单独隔离。
- `demo-upload`: Shows multipart uploads, file validation, chunked upload sessions, and temporary storage boundaries. / 演示 multipart 上传、文件校验、分片上传会话和临时存储边界。
- `demo-websocket`: Shows authenticated Socket.IO rooms, validation, errors, and response shaping. / 演示认证 Socket.IO 房间、校验、错误和响应整形。

## File Patterns / 文件模式

- `*.module.ts`: Declares NestJS dependency boundaries. / 声明 NestJS 依赖边界。
- `*.controller.ts`: Defines HTTP endpoints and request/response contracts. / 定义 HTTP 接口和请求响应契约。
- `*.service.ts`: Holds business logic or reusable runtime operations. / 承载业务逻辑或可复用运行操作。
- `dto/*.dto.ts`: Defines validated input/output data shapes. / 定义经过校验的输入输出数据结构。
- `entities/*.ts`: Defines database tables mapped by TypeORM. / 定义 TypeORM 映射的数据表。
- `*.spec.ts`: Protects behavior contracts with deterministic unit tests. / 用确定性单元测试保护行为契约。
- `*.e2e-spec.ts`: Verifies app wiring through real HTTP/WebSocket flows. / 通过真实 HTTP/WebSocket 流程验证应用装配。
