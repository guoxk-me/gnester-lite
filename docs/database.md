# Database Guide / 数据库指南

This project uses one MySQL database through NestJS + TypeORM.

本项目通过 NestJS + TypeORM 使用一个 MySQL 数据库。

Better Auth connects to that database through its own supported `mysql2/promise`
pool with UTC timezone handling. TypeORM still owns schema deployment; Better
Auth does not run schema synchronization during application startup.

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

- Entity: `src/examples/demo-database/entities/demo.entity.ts`
- Module: `src/examples/demo-database/demo-database.module.ts`
- Repository registration: `TypeOrmModule.forFeature([Demo])`
- Injection: `@InjectRepository(Demo)`

When adding an entity, put it under the owning feature module and register it with `forFeature()`.

新增 entity 时，放到所属 feature module 下，并通过 `forFeature()` 注册。

## SWC Circular Imports / SWC 循环依赖

This template compiles with SWC. Relation property types that point at another entity can trigger circular-import issues because SWC stores decorator metadata differently than `tsc`.

本模板使用 SWC 编译。实体关系字段若直接引用另一个实体类型，可能因装饰器元数据与 `tsc` 不同而触发循环依赖问题。

Prefer TypeORM's `Relation<T>` wrapper on relation fields:

关系字段优先使用 TypeORM 的 `Relation<T>` 包装：

```ts
import { Entity, OneToOne, Relation } from 'typeorm';

@Entity()
export class User {
  @OneToOne(() => Profile, (profile) => profile.user)
  profile: Relation<Profile>;
}
```

For circular constructor injection, wrap the injected type the same way (or use a local `WrapperType<T> = T`) together with `forwardRef()`.

构造函数循环注入时，同样包装注入类型（或本地定义 `WrapperType<T> = T`），并配合 `forwardRef()`。

## Migrations / 迁移

Place application migrations that production may execute in `src/migrations/`.
Feature-only Demo schema belongs to
`src/examples/demo-database/migrations/` instead.

生产环境可执行的应用迁移放在 `src/migrations/`；仅服务 Demo 的 schema 迁移放在
`src/examples/demo-database/migrations/`。

```bash
pnpm migration:create src/migrations/CreateExample
pnpm migration:generate src/migrations/CreateExample
pnpm migration:run
pnpm migration:revert

# After pnpm run build, operate on the exact production artifact:
pnpm migration:run:prod
pnpm migration:revert:prod
pnpm run verify:migrations
```

Migration discovery is deliberately environment-specific:

| Environment | Application migrations | Demo database migration |
| ----------- | ---------------------- | ----------------------- |
| development | discovered             | discovered              |
| test        | discovered             | discovered              |
| provision   | discovered             | discovered              |
| production  | discovered             | not discovered          |

The same rule applies to source TypeORM CLI execution and compiled data-source
execution. `provision` is the guarded disposable-infrastructure environment used
by migration verification. Because production never discovers the feature-owned
Demo migration, a fresh production database does not create the `demo` table.

源码 TypeORM CLI 与编译后数据源遵循同一规则。`development`、`test` 和受安全门
保护的 `provision` 会发现 Demo migration；`production` 不会发现，因此全新生产库
不会创建 `demo` 表。

This discovery change is not a rollback. If a production database already ran
`CreateDemoTable1760000000000`, its `demo` table and TypeORM migration-history
row remain. No automatic drop is attempted. The migration class/name stays
`CreateDemoTable1760000000000` so environments that include Demo migrations can
recognize existing history.

该发现规则不会自动回滚历史。已经执行过 `CreateDemoTable1760000000000` 的生产库会
保留 `demo` 表和迁移历史；如需清理，必须另行设计并审核显式生产迁移或运维步骤。

Do not rely on `synchronize` for production changes. Use migrations.

生产变更不要依赖 `synchronize`，请使用 migration。

`CreateBetterAuthTables1785801600000` is production-visible and creates the
Better Auth 1.6 core schema:

| Table          | Ownership                                    |
| -------------- | -------------------------------------------- |
| `user`         | Account identity and profile                 |
| `session`      | Opaque server-side sessions                  |
| `account`      | Credential password and future provider data |
| `verification` | Verification and reset token records         |

The dependency is pinned to Better Auth 1.6.25 because this migration matches
that generated schema. When Better Auth or its plugins are upgraded,
regenerate/diff the official schema and add a new application migration; do not
edit a migration that may already have run.

The production scripts run TypeORM with
`NODE_ENV=production` and `dist/config/typeorm.data-source.js`. Both source and
compiled data sources load the same project env-file precedence while preserving
parent-process values. Production data-source construction requires all five
`DB_*` connection fields and never falls back to localhost/root/blank/test.
`pnpm run verify:artifact` ensures the compiled data source and migrations
exist. Docker Compose runs the one-shot `migrate` service after MySQL becomes
healthy and starts `app` only after that service succeeds.

> `verify:migrations` intentionally performs an up/down/up round trip. It
> refuses to run unless the opt-in flag, loopback database/Redis hosts,
> bounded integer port, username/password, and a disposable
> `_test`/`-test`/`_ci`/`-ci` database name are all explicit in the parent
> process. The wrapper does not load dotenv files. Never point it at shared or
> production infrastructure.

## How To Change / 如何修改

- Database defaults: `config/database.config.ts`
  数据库默认值。
- Env validation: `config/validation.ts`
  环境变量校验。
- CLI data source: `config/typeorm.data-source.ts`
  CLI 数据源。
- Production-visible migrations: `src/migrations/*`
  生产环境可发现的迁移。
- Demo module/entity/migration/tests: `src/examples/demo-database/*`
  Demo 模块、实体、迁移和测试。

Common changes / 常见修改：

- Add an application table: create an entity, register it in the owning module,
  and add its production migration to `src/migrations/`.
  新增应用表：创建 entity，在所属模块注册，并将生产迁移放到 `src/migrations/`。
- Add Demo-only schema: keep its migration inside the owning Demo example and
  verify the non-production discovery boundary.
  新增仅 Demo 使用的 schema：迁移保留在所属 Demo Example 内，并验证非生产发现边界。
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
