# Demo Guide / 示例指南

This document records the demo feature modules under `src/features/`.

本文档记录 `src/features/` 下的 demo 示例模块，方便开发者和 AI agent 快速理解这些示例在演示什么。

## Runtime Setup / 运行入口

`src/app.module.ts` registers the demo modules:

`src/app.module.ts` 注册了这些 demo 模块：

- `DemoConfigModule`: configuration reading example. 配置读取示例。
- `DemoDatabaseModule`: pure TypeORM database examples. 纯 TypeORM 数据库示例。
- `DemoSerializationModule`: response serialization examples. 响应序列化示例。
- `DemoVersioningModule`: API versioning examples. API 版本控制示例。

The database demo intentionally focuses on database scenarios only. It does not demonstrate interceptors, cache, or scheduled jobs.

数据库 demo 只关注数据库场景，不演示拦截器、缓存或定时任务。

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

### Validation Usage / 校验用法

This demo is also the runnable example for `docs/validation.md`.

这个 demo 也是 `docs/validation.md` 的可运行示例。

- Body DTO validation is shown by `POST /demo-database` and `PATCH /demo-database/:id`.
  `POST /demo-database` 和 `PATCH /demo-database/:id` 演示 body DTO 校验。
- Query DTO transformation and validation are shown by `GET /demo-database/page?page=1&limit=10&order=ASC`.
  `GET /demo-database/page?page=1&limit=10&order=ASC` 演示 query DTO 转换与校验。
- Nested DTO validation is shown by `POST /demo-database/many/wrapped`.
  `POST /demo-database/many/wrapped` 演示嵌套 DTO 校验。
- Mapped-type DTO reuse is shown by `POST /demo-database/with-audit`, `POST /demo-database/name-only`, and `PATCH /demo-database/:id/description`.
  `POST /demo-database/with-audit`、`POST /demo-database/name-only` 和 `PATCH /demo-database/:id/description` 演示 mapped types 复用 DTO。
- Primitive parse pipes are shown by `GET /demo-database/:id`, `GET /demo-database/flags?enabled=true`, `GET /demo-database/by-ids?ids=1,2,3`, and `GET /demo-database/uuid/:id`.
  `GET /demo-database/:id`、`GET /demo-database/flags?enabled=true`、`GET /demo-database/by-ids?ids=1,2,3` 和 `GET /demo-database/uuid/:id` 演示基础类型解析 pipe。
- Invalid body, query, or param input is handled by the global `ValidationPipe` from `src/common/validation/validation.pipe.ts`.
  非法 body、query 或 param 输入由 `src/common/validation/validation.pipe.ts` 中的全局 `ValidationPipe` 处理。

For change rules and error formatting, see `docs/validation.md`.

修改规则和错误格式参考 `docs/validation.md`。

## Demo Serialization / 序列化示例

Files / 文件：

- `src/features/demo-serialization/demo-serialization.module.ts`
- `src/features/demo-serialization/demo-serialization.controller.ts`
- `src/features/demo-serialization/demo-serialization.service.ts`
- `src/features/demo-serialization/dto/demo-serialization-user.dto.ts`
- `src/features/demo-serialization/dto/demo-serialization-page.dto.ts`
- `src/features/demo-serialization/dto/demo-serialization-role.dto.ts`

This demo is the runnable example for `docs/serialization.md`.

这个 demo 是 `docs/serialization.md` 的可运行示例。

Public profile / 公开资料：

```http
GET /demo-serialization/profile
```

```json
{
  "id": 1,
  "firstName": "Ada",
  "lastName": "Lovelace",
  "emailAddress": "ada@example.com",
  "role": "maintainer",
  "fullName": "Ada Lovelace"
}
```

Admin profile with grouped fields / 带分组字段的管理员资料：

```http
GET /demo-serialization/profile/admin
```

```json
{
  "id": 1,
  "firstName": "Ada",
  "lastName": "Lovelace",
  "emailAddress": "ada@example.com",
  "role": "maintainer",
  "auditTrail": ["created-by-seed", "reviewed-by-admin"],
  "fullName": "Ada Lovelace"
}
```

Plain object serialized through a response DTO / 普通对象通过响应 DTO 序列化：

```http
GET /demo-serialization/profile/plain
```

Nested plain array serialized through a page DTO / 嵌套普通数组通过分页 DTO 序列化：

```http
GET /demo-serialization/page/plain
```

What it shows / 演示点：

- `ClassSerializerInterceptor` applies `class-transformer` rules to outbound responses.
  `ClassSerializerInterceptor` 将 `class-transformer` 规则应用到出站响应。
- `@Exclude()` and `@Expose()` control which fields are returned.
  `@Exclude()` 和 `@Expose()` 控制哪些字段会返回。
- Getter-based fields expose `fullName` and `emailAddress` without returning the raw `email` property.
  getter 字段暴露 `fullName` 和 `emailAddress`，但不直接返回原始 `email` 属性。
- `@Transform()` turns the role object into the role name in the HTTP response.
  `@Transform()` 在 HTTP 响应中把 role 对象转换成 role 名称。
- `@SerializeOptions({ groups: ['admin'] })` exposes admin-only fields.
  `@SerializeOptions({ groups: ['admin'] })` 暴露仅管理员可见字段。
- `@SerializeOptions({ type })` applies DTO serialization to plain objects.
  `@SerializeOptions({ type })` 让普通对象也套用 DTO 序列化规则。
- `excludePrefixes: ['_']` removes internal metadata such as `_internalTraceId` and `_cacheKey`.
  `excludePrefixes: ['_']` 移除 `_internalTraceId` 和 `_cacheKey` 等内部元数据。

For response-shaping rules and guardrails, see `docs/serialization.md`.

响应改形规则和注意事项参考 `docs/serialization.md`。

## Demo Versioning / 版本控制示例

Files / 文件：

- `src/features/demo-versioning/demo-versioning.module.ts`
- `src/features/demo-versioning/demo-versioning.controller.ts`
- `src/features/demo-versioning/demo-versioning.service.ts`
- `src/features/demo-versioning/dto/demo-versioning-response.dto.ts`

Global setup / 全局配置：

```ts
app.enableVersioning({
  type: VersioningType.URI,
  prefix: 'v',
  defaultVersion: '1',
});
```

What it shows / 演示点：

- URI versioning uses `/v1` and `/v2` path prefixes.
  URI 版本控制使用 `/v1` 和 `/v2` 路径前缀。
- `defaultVersion: '1'` treats controllers without explicit versions as version 1.
  `defaultVersion: '1'` 会把未显式声明版本的 controller 归为版本 1。
- Controller-level `version: '1'` can set a default version for every route in a controller.
  controller 级 `version: '1'` 可以给当前 controller 下的路由设置默认版本。
- Route-level `@Version('2')` can expose a different handler for the same route.
  route 级 `@Version('2')` 可以在同一路由上暴露不同 handler。
- `@Version(['1', '2'])` shares one handler across multiple versions.
  `@Version(['1', '2'])` 让同一个 handler 同时支持多个版本。
- `VERSION_NEUTRAL` exposes routes that do not require a version prefix.
  `VERSION_NEUTRAL` 暴露不需要版本前缀的路由。

Version 1 response / 版本 1 响应：

```http
GET /v1/demo-versioning
```

```json
{
  "version": "1",
  "message": "demo versioning response for v1"
}
```

Version 2 response / 版本 2 响应：

```http
GET /v2/demo-versioning
```

```json
{
  "version": "2",
  "message": "demo versioning response for v2",
  "changes": ["adds a changes field"]
}
```

Shared response / 多版本共享响应：

```http
GET /v1/demo-versioning/shared
GET /v2/demo-versioning/shared
```

```json
{
  "versions": ["1", "2"],
  "message": "shared response for v1 and v2"
}
```

Version-neutral response / 版本中立响应：

```http
GET /demo-versioning/neutral
```

```json
{
  "version": "neutral",
  "message": "available without an API version prefix"
}
```

## Verify / 验证

Run the normal checks after changing demo behavior:

修改 demo 行为后运行常规检查：

```bash
pnpm run format
pnpm run lint
pnpm run test
pnpm run build
```
