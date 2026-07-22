# Config Guide / 配置指南

> CN: 文档文件，说明 configuration 的用途；EN: Documentation file explains the purpose of configuration.

This document is for AI agents and developers who need to change configuration safely.

本文档面向需要安全修改配置的 AI agent 和开发者。

## Mental Model / 配置模型

- `config/config.yaml`: static, non-secret defaults that can be committed.
  可提交的静态非敏感默认值。
- `.env.*` or runtime env: environment values and secrets.
  环境相关配置和密钥。
- Database uses MySQL.
  数据库使用 MySQL。

Rule / 判断规则：

```text
Safe in a public PR? -> config/config.yaml
可以出现在公开 PR？-> config/config.yaml

Secret or environment-specific? -> .env.* / secret manager
密钥或环境相关？-> .env.* / 密钥管理系统
```

## Load Flow / 加载流程

`src/app.module.ts` wires config:

`src/app.module.ts` 接入配置：

```ts
ConfigModule.forRoot({
  load: [configuration],
  envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
  isGlobal: true,
  cache: true,
  validate,
});
```

Common env files / 常用环境文件：

- `NODE_ENV=development` -> `.env.development`
- `NODE_ENV=test` -> `.env.test`
- `NODE_ENV=production` -> `.env.production`

Runtime env overrides `.env` file values.

运行时环境变量优先于 `.env` 文件。

## Key Files / 关键文件

- `config/config.yaml`: YAML defaults. YAML 默认值。
- `config/configuration.ts`: YAML loader and validation. YAML 加载与校验。
- `config/validation.ts`: env validation. 环境变量校验。
- `config/database.config.ts`: MySQL TypeORM options. MySQL TypeORM 配置。
- `config/typeorm.data-source.ts`: TypeORM CLI data source. TypeORM CLI 数据源。
- `src/app.module.ts`: Nest module wiring. Nest 模块接线。
- `nest-cli.json`: copies `config/*.yaml` to `dist`. 将 `config/*.yaml` 复制到 `dist`。

## Current Values / 当前配置

YAML:

```yaml
app:
  name: gnester-lite

cache:
  ttl: 0

schedule:
  enabled: false
  timeZone: Asia/Shanghai

queue:
  enabled: true
  prefix: gnester-lite
  defaultAttempts: 3
  backoffDelay: 1000
  removeOnComplete: 1000
  removeOnFail: 5000

http:
  baseUrl: https://jsonplaceholder.typicode.com
  timeout: 5000
  maxRedirects: 5
  maxContentLength: 10485760
  maxBodyLength: 10485760
```

Env:

```text
NODE_ENV
PORT
DB_HOST
DB_PORT
DB_USERNAME
DB_PASSWORD
DB_DATABASE
DB_SYNCHRONIZE
DB_AUTO_LOAD_ENTITIES
DB_RETRY_ATTEMPTS
DB_RETRY_DELAY
REDIS_URL
JWT_SECRET
JWT_ACCESS_TOKEN_TTL
JWT_ISSUER
JWT_AUDIENCE
CSRF_ENABLED
CSRF_SECRET
CSRF_COOKIE_NAME
CSRF_IDENTIFIER_COOKIE_NAME
CSRF_COOKIE_SECURE
CSRF_COOKIE_SAME_SITE
CSRF_HEADER_NAME
```

Notes / 说明：

- MySQL is fixed in code; do not add `*_DB_TYPE`.
  数据库类型在代码中固定为 MySQL；不要新增 `*_DB_TYPE`。
- `DB_SYNCHRONIZE` is forced off in production.
  `DB_SYNCHRONIZE` 在生产环境会被强制关闭。
- `REDIS_URL` defaults to `redis://localhost:6379`.
  `REDIS_URL` 默认值为 `redis://localhost:6379`。
- `JWT_SECRET` is required in production and defaults only for local/test usage.
  `JWT_SECRET` 在生产环境必填；默认值只用于本地和测试环境。
- `CSRF_SECRET` is required in production when `CSRF_ENABLED=true`.
  `CSRF_ENABLED=true` 且运行在生产环境时，`CSRF_SECRET` 必填。
- CSRF defaults protect browser cookie/session clients and can be disabled with
  `CSRF_ENABLED=false` for pure bearer-token APIs.
  CSRF 默认保护浏览器 cookie/session 客户端；纯 bearer-token API 可用
  `CSRF_ENABLED=false` 关闭。

## How To Change / 如何修改

Add static config / 新增静态配置：

1. Add it to `config/config.yaml`.
   添加到 `config/config.yaml`。
2. Update the type and checks in `config/configuration.ts`.
   更新 `config/configuration.ts` 的类型和校验。
3. Read it with `ConfigService`.
   使用 `ConfigService` 读取。

Add env config / 新增环境配置：

1. Add it to `.env.*` or the secret manager.
   添加到 `.env.*` 或密钥管理系统。
2. Add validation in `config/validation.ts`.
   在 `config/validation.ts` 添加校验。
3. Use `getOrThrow()` for required values.
   必填值使用 `getOrThrow()`。

## Verify / 验证

```bash
pnpm run format
pnpm run lint
pnpm run test
pnpm run build
```
