# Sentry / 错误与性能监控

> CN: 文档文件，说明 sentry 的用途；EN: Documentation file explains the purpose of sentry.

This template integrates Sentry for unexpected error capture and optional
request tracing. The SDK is optional at runtime: leave `SENTRY_DSN` empty to
keep local and CI runs offline.

本模板接入 Sentry，用于捕获未预期错误，并可选择开启请求追踪。运行时可选：
不设置 `SENTRY_DSN` 时，本地和 CI 可离线运行。

## Layout / 结构

- `src/instrument.ts`: calls `Sentry.init` before Nest modules load.
  在 Nest 模块加载前调用 `Sentry.init`。
- `src/common/sentry/sentry.module.ts`: registers `SentryModule` and
  `SentryGlobalFilter`.
  注册 `SentryModule` 与 `SentryGlobalFilter`。
- `src/common/sentry/with-sentry-isolation.ts`: isolates cron / queue / event
  scopes.
  隔离定时任务、队列和事件的作用域。
- `src/features/demo-sentry/`: status and debug endpoints.
  状态查询与调试端点。

## Configuration / 配置

Env:

```text
SENTRY_DSN
SENTRY_ENABLED
SENTRY_TRACES_SAMPLE_RATE
```

Notes / 说明：

- `SENTRY_DSN` is optional. Empty means Sentry stays uninitialized.
  `SENTRY_DSN` 可选。为空时不初始化 Sentry。
- `SENTRY_ENABLED=false` disables init even when a DSN is present.
  即使有 DSN，`SENTRY_ENABLED=false` 也会跳过初始化。
- `NODE_ENV=test` never initializes Sentry.
  `NODE_ENV=test` 不会初始化 Sentry。
- Without `SENTRY_TRACES_SAMPLE_RATE`, development uses `1` and production uses
  `0.1`.
  未设置 `SENTRY_TRACES_SAMPLE_RATE` 时，开发环境为 `1`，生产环境为 `0.1`。
- Init reads `process.env` directly because it must run before `ConfigModule`.
  初始化直接读取 `process.env`，因为它必须早于 `ConfigModule`。

## HTTP Errors / HTTP 异常

`SentryGlobalFilter` reports unhandled exceptions. Nest `HttpException`
responses (including validation failures) are not captured by default because
they usually act as control flow.

`SentryGlobalFilter` 上报未处理异常。Nest 的 `HttpException`（含校验失败）
默认不上报，因为它们通常用作控制流。

Verify with:

```http
GET /demo-sentry/debug-sentry
```

When a DSN is configured, the thrown `Error` should appear in the Sentry
project Issues list.

配置 DSN 后，抛出的 `Error` 应出现在 Sentry 项目的 Issues 列表中。

## Background Jobs / 后台任务

Wrap cron, queue, and event handlers with `withSentryIsolation()` so breadcrumbs
and tags from background work do not leak into unrelated HTTP error events.

用 `withSentryIsolation()` 包裹定时任务、队列和事件处理，避免后台任务的
breadcrumb / tag 泄漏到无关的 HTTP 错误事件。

This template already does that in:

本模板已在以下位置使用：

- `demo-schedule.service.ts`
- `demo-queue.processor.ts`
- `demo-events.listener.ts`

## WebSocket / WebSocket

`APP_FILTER` registration does not apply to Nest gateways. The demo WebSocket
exception filter therefore calls `Sentry.captureException()` for unexpected
errors, while skipping `HttpException` / `WsException` control-flow cases.

`APP_FILTER` 不会作用到 Nest gateway。因此 demo WebSocket 异常过滤器会对
未预期错误调用 `Sentry.captureException()`，并跳过 `HttpException` /
`WsException` 这类控制流异常。

## Source Maps / Source Maps

Production stack traces are clearer after uploading source maps:

生产环境上传 source maps 后堆栈更易读：

```bash
npx @sentry/wizard@latest -i sourcemaps
```

## Demo Routes / 示例路由

```http
GET /demo-sentry/scenarios
GET /demo-sentry/status
GET /demo-sentry/debug-sentry
```

## Verify / 验证

```bash
pnpm run lint:check
pnpm run test -- src/common/sentry src/features/demo-sentry src/features/demo-websocket/demo-websocket-exception.filter.spec.ts
pnpm run build
```
