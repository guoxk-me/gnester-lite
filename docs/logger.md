# Logger / 日志

> CN: 文档文件，说明 logger 的用途；EN: Documentation file explains the purpose of logger.

This template uses [nestjs-pino](https://github.com/iamolegga/nestjs-pino)
(Pino’s recommended Nest integration) for structured application logs and HTTP
access logs. Sentry remains responsible for error/performance monitoring.

本模板使用 [nestjs-pino](https://github.com/iamolegga/nestjs-pino)
（Pino 官方推荐的 Nest 集成）提供结构化应用日志与 HTTP 访问日志。错误与性能
监控仍由 Sentry 负责。

## Layout / 结构

- `src/common/logger/logger.module.ts`: wraps `LoggerModule.forRootAsync`.
  封装 `LoggerModule.forRootAsync`。
- `src/common/logger/logger.config.ts`: maps `LOGGER_*` / `app.name` to Pino
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

- `LOGGER_JSON` defaults to `true` in production. When `false` outside `test`,
  logs use `pino-pretty`.
  `LOGGER_JSON` 生产默认 `true`；在非 `test` 环境为 `false` 时使用
  `pino-pretty`。
- `LOGGER_LEVELS` accepts Nest level names
  (`log|fatal|error|warn|debug|verbose`). The most verbose entry becomes the
  Pino threshold (`verbose`→`trace`, `log`→`info`).
  `LOGGER_LEVELS` 使用 Nest 级别名；取最详细一级作为 Pino 阈值
  （`verbose`→`trace`，`log`→`info`）。
- Defaults without `LOGGER_LEVELS`: production `info`, development `debug`,
  test `warn`.
  未设置 `LOGGER_LEVELS` 时：生产 `info`，开发 `debug`，测试 `warn`。
- `/health` probe traffic skips automatic request/response logging.
  `/health` 探针请求不写自动 access log。

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
pnpm run test -- src/common/logger/logger.config.spec.ts
pnpm run lint:check
pnpm run build
```
