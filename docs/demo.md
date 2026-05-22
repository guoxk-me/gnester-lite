# Demo Guide / 示例指南

This document records the demo feature modules under `src/features/`.

本文档记录 `src/features/` 下的 demo 示例模块，方便开发者和 AI agent 快速理解这些示例在演示什么。

## Runtime Setup / 运行入口

`src/app.module.ts` registers the demo modules:

`src/app.module.ts` 注册了这些 demo 模块：

- `DemoConfigModule`: configuration reading example. 配置读取示例。
- `DemoDatabaseModule`: pure TypeORM database examples. 纯 TypeORM 数据库示例。

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

## Demo Database / 数据库示例

Files / 文件：

- `src/features/demo-database/demo-database.module.ts`
- `src/features/demo-database/demo-database.controller.ts`
- `src/features/demo-database/demo-database.service.ts`
- `src/features/demo-database/entities/demo.entity.ts`
- `src/features/demo-database/dto/create-demo.dto.ts`
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

Find all / 查询全部：

```http
GET /demo-database
```

Find page / 分页查询：

```http
GET /demo-database/page?page=1&limit=10
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
- `findPage()` uses `findAndCount()` for paginated reads.
  `findPage()` 使用 `findAndCount()` 做分页查询。
- `findManyByIds()` uses `In()` for ID-list queries.
  `findManyByIds()` 使用 `In()` 做 ID 集合查询。
- `searchByName()` uses a query builder for custom SQL conditions.
  `searchByName()` 使用 query builder 编写自定义查询条件。
- `count()` uses repository counting for aggregate reads.
  `count()` 使用 repository count 做聚合读取。

## Verify / 验证

Run the normal checks after changing demo behavior:

修改 demo 行为后运行常规检查：

```bash
pnpm run format
pnpm run lint
pnpm run test
pnpm run build
```
