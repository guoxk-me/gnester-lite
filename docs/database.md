# Database Guide / 数据库指南

This project uses one MySQL database through NestJS + TypeORM.

本项目通过 NestJS + TypeORM 使用一个 MySQL 数据库。

## Runtime Setup / 运行时配置

- `src/app.module.ts` registers the TypeORM connection.
  `src/app.module.ts` 注册 TypeORM 连接。
- `config/database.config.ts` builds runtime and CLI options.
  `config/database.config.ts` 构建运行时和 CLI 配置。
- The driver is always `mysql`; env does not choose the database type.
  驱动固定为 `mysql`；环境变量不选择数据库类型。
- Runtime entities use compiled JS globs plus `autoLoadEntities`.
  运行时 entity 使用编译后的 JS glob，并配合 `autoLoadEntities`。

Preferred env keys / 推荐环境变量：

```text
DB_HOST
DB_PORT
DB_USERNAME
DB_PASSWORD
DB_DATABASE
DB_SYNCHRONIZE
DB_AUTO_LOAD_ENTITIES
DB_RETRY_ATTEMPTS
DB_RETRY_DELAY
```

## Feature Modules / 功能模块

Demo database feature / Demo 数据库功能：

- Entity: `src/features/demo-database/entities/demo.entity.ts`
- Module: `src/features/demo-database/demo-database.module.ts`
- Repository registration: `TypeOrmModule.forFeature([Demo])`
- Injection: `@InjectRepository(Demo)`

When adding an entity, put it under the owning feature module and register it with `forFeature()`.

新增 entity 时，放到所属 feature module 下，并通过 `forFeature()` 注册。

## Migrations / 迁移

Place generated migrations in `src/migrations/`.

生成的迁移文件放在 `src/migrations/`。

```bash
pnpm migration:create src/migrations/CreateExample
pnpm migration:generate src/migrations/CreateExample
pnpm migration:run
pnpm migration:revert
```

Do not rely on `synchronize` for production changes. Use migrations.

生产变更不要依赖 `synchronize`，请使用 migration。

## How To Change / 如何修改

- Database defaults: `config/database.config.ts`
  数据库默认值。
- Env validation: `config/validation.ts`
  环境变量校验。
- CLI data source: `config/typeorm.data-source.ts`
  CLI 数据源。
- Demo module/tests: `src/features/demo-database/*`
  Demo 模块和测试。

Common changes / 常见修改：

- Add a table: create an entity, register it in the module, add a migration, test the service.
  新增表：创建 entity，在模块注册，添加 migration，测试 service。
- Change connection values: update `.env.*`; do not add another data source.
  修改连接值：更新 `.env.*`；不要新增数据源。

## Verify / 验证

```bash
pnpm run format
pnpm run lint
pnpm run test
pnpm run build
```

If startup fails with `Unable to connect to the database`, read the nested error first.

如果启动失败并出现 `Unable to connect to the database`，先查看内层错误。
