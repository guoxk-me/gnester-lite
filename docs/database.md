# Database / 数据库

应用使用一个 MySQL 数据库和一个 TypeORM 连接。`AppModule` 注册连接，`src/infra/database/database.config.ts` 提供运行时与 CLI 选项，`typeorm.data-source.ts` 提供迁移入口。连接值和校验属于 `src/config/`；数据库运行适配属于 `infra/database`。

## Ownership / 所有权

业务查询、实体和持久化类型归所属模块。`identity` 拥有账号、凭据、会话和邀请；`assistant` 拥有个人 Key、模型、偏好、会话、问题和回答。跨模块合作通过公开契约，不直接查询另一模块的私有表。

新增 TypeORM 实体放在所属模块，通过 `TypeOrmModule.forFeature(...)` 本地注册；消费者显式导入对应模块。当前业务保留原有参数化 SQL 和事务，目录调整不改变表结构。

原生 ESM 的实体关系字段使用 `Relation<T>`，避免直接关系类型在装饰器元数据求值时触发循环导入。模块依赖仍须单向；不要用 `forwardRef()` 掩盖业务边界问题。

## Migrations / 迁移

应用迁移集中在 `src/infra/database/migrations/`，所有环境只发现应用迁移。源码 CLI 和编译后 CLI 遵循同一规则，编译入口为 `dist/src/infra/database/typeorm.data-source.js`。

```bash
pnpm migration:create src/infra/database/migrations/AddApplicationChange
pnpm migration:generate src/infra/database/migrations/AddApplicationChange
pnpm migration:run
pnpm migration:revert

# Controlled production deployment, after build:
pnpm migration:run:prod
pnpm migration:revert:prod
```

保留已部署迁移的类名、name、SQL 和时间戳。`CreateBetterAuthTables1785801600000` 是历史名称，当前应用认证继续使用其中的 `user`、`account`、`session` 表。`verification` 是历史兼容表；`AddApplicationRefreshSessions1788105600000` 添加记住登录状态字段。后续 schema 变更新增迁移，不修改已执行历史。

Demo 迁移已退出发现列表；本次目录整理不会删除现有 Demo 表或迁移历史，也不会对已有数据库执行操作。

生产强制关闭 `DB_SYNCHRONIZE`。连接创建要求显式的五个 `DB_*` 字段，不回退到 localhost/root/空密码。运行时与 CLI 使用同一环境文件优先级，进程环境优先。Docker Compose 的一次性 `migrate` 服务成功后才启动应用。

## Verification / 验证

`verify:artifact` 检查编译数据源和迁移文件。`verify:migrations` 执行 up/down/up，因此只能指向明确可丢弃的基础设施：需要 `GNESTER_ALLOW_DESTRUCTIVE_INTEGRATION=true`、显式 loopback MySQL/Redis、合法端口、用户名密码以及以 `_test`、`-test`、`_ci`、`-ci` 结尾的数据库名。包装脚本不加载 dotenv。完整规则见 `scripts/run-destructive-integration.mjs`。

启动出现 `Unable to connect to the database` 时，先查看内层连接错误。
