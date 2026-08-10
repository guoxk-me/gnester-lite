# Logger / 日志

This template uses [nestjs-pino](https://github.com/iamolegga/nestjs-pino)
(Pino’s recommended Nest integration) for structured application logs and HTTP
access logs. Sentry remains responsible for error/performance monitoring.

本模板使用 [nestjs-pino](https://github.com/iamolegga/nestjs-pino)
（Pino 官方推荐的 Nest 集成）提供结构化应用日志与 HTTP 访问日志。错误与性能
监控仍由 Sentry 负责。

## Layout / 结构

- `src/platform/observability/logger/logger.module.ts`: wraps `LoggerModule.forRootAsync`.
  封装 `LoggerModule.forRootAsync`。
- `src/platform/observability/logger/logger.config.ts`: maps `LOGGER_*` / `app.name` to Pino
  options.
  将 `LOGGER_*` / `app.name` 映射为 Pino 配置。
- `src/main.ts`: `bufferLogs: true` + `app.useLogger(app.get(Logger))`.
  缓冲启动日志，再挂载 nestjs-pino `Logger`。

## Configuration / 配置

Env:

```text
LOGGER_JSON
LOGGER_LEVELS
```

Notes / 说明：

- `LOGGER_JSON=false` is allowed only outside production/test and uses
  `pino-pretty` there. Production validation rejects it, and the logger factory
  independently refuses to resolve the development-only transport.
- `LOGGER_LEVELS` accepts Nest level names
  (`log|fatal|error|warn|debug|verbose`). The most verbose entry becomes the
  Pino threshold (`verbose`→`trace`, `log`→`info`).
  `LOGGER_LEVELS` 使用 Nest 级别名；取最详细一级作为 Pino 阈值
  （`verbose`→`trace`，`log`→`info`）。
- Defaults without `LOGGER_LEVELS`: production `info`, development `debug`,
  test `warn`.
  未设置 `LOGGER_LEVELS` 时：生产 `info`，开发 `debug`，测试 `warn`。
- Only exact `/health/live` and `/health/ready` probe paths (with optional
  query strings) skip automatic request/response logging.
- Request access logs keep an explicit allowlist of request ID, method, URL
  pathname, and remote address/port. They omit all request headers and parsed
  query data; response access logs keep only the status code. This prevents
  unknown API-key/identity headers, Referer queries, redirect credentials, and
  query values from being persisted in the log sink. Put safe diagnostic
  context in explicit structured fields instead.
  请求访问日志仅保留 request ID、方法、URL 路径和远端地址/端口白名单；所有请求头与
  已解析查询参数均不会写入日志，响应访问日志仅保留状态码，从而避免未知 API
  key/身份头、Referer 查询、重定向凭据和查询值被持久化。安全的诊断上下文应使用
  显式结构化字段。

## Usage / 用法

Keep using Nest’s `Logger` in feature code; after `app.useLogger`, calls go
through Pino:

```ts
import { Logger } from '@nestjs/common';

private readonly logger = new Logger(MyService.name);
this.logger.log('Doing something...');
```

For request-scoped bindings, inject nestjs-pino’s `Logger` or
`@InjectPinoLogger()`.

需要请求上下文绑定时，注入 nestjs-pino 的 `Logger` 或 `@InjectPinoLogger()`。

## Verify / 验证

```bash
pnpm run test -- src/platform/observability/logger/logger.config.spec.ts
pnpm run lint:check
pnpm run build
```
