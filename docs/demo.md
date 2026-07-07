# Demo Guide / 示例指南

This document records the demo feature modules under `src/features/`.

本文档记录 `src/features/` 下的 demo 示例模块，方便开发者和 AI agent 快速理解这些示例在演示什么。

## Runtime Setup / 运行入口

`src/app.module.ts` registers the demo modules:

`src/app.module.ts` 注册了这些 demo 模块：

- `DemoConfigModule`: configuration reading example. 配置读取示例。
- `DemoCsrfModule`: CSRF token and protected mutation examples. CSRF token 与受保护写请求示例。
- `DemoDatabaseModule`: pure TypeORM database examples. 纯 TypeORM 数据库示例。
- `DemoEventsModule`: in-process event emitter examples. 进程内事件示例。

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
- `src/main.ts` registers CSRF after cookie/session middleware and before global
  pipes and routes. `src/main.ts` 在 cookie/session 中间件之后、全局 pipe 和路由之前注册 CSRF。
- Browser clients fetch a token first, then submit it in `x-csrf-token` for
  unsafe methods. 浏览器客户端先获取 token，再在 unsafe method 中通过
  `x-csrf-token` 提交。
- Missing or invalid tokens return a stable `CSRF_TOKEN_INVALID` 403 response.
  token 缺失或无效时返回稳定的 `CSRF_TOKEN_INVALID` 403 响应。
- The overview endpoint documents when CSRF is needed and when bearer-token APIs
  usually do not need it. overview 接口说明哪些场景需要 CSRF，以及为什么纯 bearer-token API 通常不需要。


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
- `FindDemoParamsDto` demonstrates validating `@Param()` as a DTO with `@IsNumberString()`.
  `FindDemoParamsDto` 演示使用 `@IsNumberString()` 校验 `@Param()` DTO。
- `ListDemoQueryDto` demonstrates transformed query DTOs, integer ranges, defaults, and enum validation.
  `ListDemoQueryDto` 演示 query DTO 转换、整数范围、默认值和枚举校验。
- `demo-mapped-types.dto.ts` demonstrates `PickType()`, `OmitType()`, and `IntersectionType()`.
  `demo-mapped-types.dto.ts` 演示 `PickType()`、`OmitType()` 和 `IntersectionType()`。
- `findPage()` uses `findAndCount()` for paginated reads and supports `ASC` / `DESC` ordering.
  `findPage()` 使用 `findAndCount()` 做分页查询，并支持 `ASC` / `DESC` 排序。
- `findManyByIds()` uses `In()` for ID-list queries.
  `findManyByIds()` 使用 `In()` 做 ID 集合查询。
- `ParseIntPipe`, `ParseBoolPipe`, `ParseArrayPipe`, and `ParseUUIDPipe` demonstrate explicit primitive parsing.
  `ParseIntPipe`、`ParseBoolPipe`、`ParseArrayPipe` 和 `ParseUUIDPipe` 演示显式基础类型解析。
- `searchByName()` uses a query builder for custom SQL conditions.
  `searchByName()` 使用 query builder 编写自定义查询条件。
- `count()` uses repository counting for aggregate reads.
  `count()` 使用 repository count 做聚合读取。

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
