# Config Guide / 配置指南

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
  envFilePath: environmentFilePaths(),
  isGlobal: true,
  cache: true,
  validate,
});
```

Files are considered in this precedence order:

1. `.env.<NODE_ENV>.local`
2. `.env.<NODE_ENV>`
3. `.env.local`
4. `.env`

文件按上述优先级加载；前面的值不会被后面的文件覆盖。

Runtime env overrides `.env` file values.

运行时环境变量优先于 `.env` 文件。

`src/instrument.ts` calls the same loader before reading Sentry settings, so
early instrumentation and Nest `ConfigModule` observe the same files and
case-insensitive boolean rules. Invalid Sentry sample rates fail before
`Sentry.init`.

The TypeORM CLI data source calls this loader too. Source and compiled migration
commands therefore use the same runtime-first file precedence instead of
silently falling back to a different local database.

`.env.example` is the complete, non-secret variable inventory. Copy it to an
ignored local file such as `.env.development.local`; production secrets should
come from the deployment secret manager rather than committed env files.

`NODE_ENV=provision` is reserved for destructive CI/local integration against
disposable infrastructure. It is never a deployment mode and disables early
Sentry initialization.

## Key Files / 关键文件

- `config/config.yaml`: YAML defaults. YAML 默认值。
- `.env.example`: complete environment-variable contract without production
  credentials. 完整环境变量契约，不含生产凭据。
- `config/environment-files.ts`: file precedence and early Sentry environment
  semantics. 文件优先级与 Sentry 早期环境语义。
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

shutdown:
  readinessPropagationDelayMs: 5000
  applicationCloseTimeoutMs: 10000
  telemetryCloseTimeoutMs: 2000

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

`app.name` and `queue.prefix` become Redis namespace segments. Each must contain
at least one letter or digit, may use letters, digits, `-`, `_`, and `.`, and is
limited to 64 characters. `rateLimit.errorMessage` must contain at least one
non-whitespace character.

`app.name` 与 `queue.prefix` 会成为 Redis 命名空间片段：必须至少包含一个字母或
数字，只能使用字母、数字、`-`、`_`、`.`，且最长 64 个字符。
`rateLimit.errorMessage` 必须至少包含一个非空白字符。

The complete environment list and local-safe examples live in `.env.example`.
The main groups are:

```text
runtime and shutdown, MySQL, Redis, CORS, cookies, compression, sessions,
CSRF, Better Auth, JWT, encryption/HMAC, logging, and Sentry
```

Notes / 说明：

- MySQL is fixed in code; do not add `*_DB_TYPE`.
  数据库类型在代码中固定为 MySQL；不要新增 `*_DB_TYPE`。
- `DB_SYNCHRONIZE` is forced off in production.
  `DB_SYNCHRONIZE` 在生产环境会被强制关闭。
- Development/test `REDIS_URL` defaults to `redis://localhost:6379`.
  Production requires explicit `DB_HOST`, `DB_PORT`, `DB_USERNAME`,
  `DB_PASSWORD`, `DB_DATABASE`, and `REDIS_URL`; blank values fail startup and
  TypeORM CLI database creation also fails closed.
- `PORT` may be zero only outside production. Discrete environment/YAML budgets
  must be bounded integers; fractional values are rejected.
- Every non-wildcard `CORS_ORIGINS` entry must be a canonical `http://` or
  `https://` origin with no path, query, fragment, or trailing slash.
- Session and CSRF cookie names must use valid cookie-token syntax. Active
  session, effective CSRF token, and effective CSRF identifier cookie names
  must be distinct; the comparison includes the production `__Host-`
  promotion of default CSRF names.
- `JWT_SECRET`, `HMAC_SECRET`, and `ENCRYPTION_KEY` are required and strength
  checked in production. Placeholder, public example, low-diversity,
  short-period, or reused values are rejected. Generate every secret
  independently.
  生产环境强制要求并校验这些密钥，拒绝占位符和低多样性值。
- `CSRF_SECRET` is required in production when `CSRF_ENABLED=true`.
  `CSRF_ENABLED=true` 且运行在生产环境时，`CSRF_SECRET` 必填。
- `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are required in production. The
  secret is strength-checked and must not be reused; the URL and trusted origins
  require HTTPS and cannot be loopback origins. Production Better Auth cookies
  are always `Secure`.
- `BETTER_AUTH_TRUSTED_ORIGINS` takes precedence over CORS. When omitted, CORS
  origins are reused only if both CORS and credential sharing are enabled;
  wildcard origins are never trusted.
- CSRF defaults protect browser cookie/session clients and can be disabled with
  `CSRF_ENABLED=false` for pure bearer-token APIs.
  CSRF 默认保护浏览器 cookie/session 客户端；纯 bearer-token API 可用
  `CSRF_ENABLED=false` 关闭。
- `SENTRY_DSN` is optional; leave it empty to disable Sentry.
  `SENTRY_DSN` 可选；留空即关闭 Sentry。
- Shutdown uses three bounded phases: 5 seconds for readiness propagation,
  10 seconds shared by HTTP drain and Nest application close, and 2 seconds for
  telemetry close. The internal maximum is 17 seconds; every process supervisor
  grace period must be longer.
  关停分为三个有界阶段：5 秒就绪传播、HTTP drain 与 Nest close 共用 10 秒、
  telemetry close 2 秒。内部上限为 17 秒，进程管理器的 grace period 必须更长。
- `LOGGER_JSON` is required to remain JSON in production; an explicit `false`
  fails validation. Development may set it to `false` to use `pino-pretty`.
  Nest level names in `LOGGER_LEVELS` map to a Pino threshold
  (`verbose`→`trace`, `log`→`info`).
  `LOGGER_JSON` 生产环境必须为 JSON；开发环境为 `false` 时使用 `pino-pretty`。
  `LOGGER_LEVELS` 使用 Nest 级别名，并映射为 Pino 阈值
  （`verbose`→`trace`，`log`→`info`）。
- Static YAML validation rejects undeclared root, section, and throttler keys.
  Remove obsolete keys and update `configuration.ts` before adding a new one.
  静态 YAML 会拒绝未声明的根级、分区级和 throttler 配置键；废弃键应删除，新增键
  必须先同步更新 `configuration.ts`。

## How To Change / 如何修改

Add static config / 新增静态配置：

1. Add it to `config/config.yaml`.
   添加到 `config/config.yaml`。
2. Update the type and checks in `config/configuration.ts`.
   更新 `config/configuration.ts` 的类型和校验。
3. Read it with `ConfigService`.
   使用 `ConfigService` 读取。

Add env config / 新增环境配置：

1. Add its documented local-safe form to `.env.example`.
   在 `.env.example` 中增加安全的本地示例。
2. Supply actual environment values through an ignored `.env.*.local` file or
   the deployment secret manager.
3. Add validation in `config/validation.ts`.
   在 `config/validation.ts` 添加校验。
4. Use `getOrThrow()` for required values.
   必填值使用 `getOrThrow()`。

## Verify / 验证

```bash
pnpm run format
pnpm run lint
pnpm run test
pnpm run build
```
