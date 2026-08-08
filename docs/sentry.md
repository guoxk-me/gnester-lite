# Sentry / 错误与性能监控

This template integrates Sentry for unexpected error capture and optional
request tracing. The SDK is optional at runtime: leave `SENTRY_DSN` empty to
keep local and CI runs offline.

本模板接入 Sentry，用于捕获未预期错误，并可选择开启请求追踪。运行时可选：
不设置 `SENTRY_DSN` 时，本地和 CI 可离线运行。

## Layout / 结构

- `src/instrument.ts`: calls `Sentry.init` before Nest modules load.
  在 Nest 模块加载前调用 `Sentry.init`。
- `src/platform/observability/sentry/sentry.module.ts`: registers `SentryModule` and
  `SentryGlobalFilter`.
  注册 `SentryModule` 与 `SentryGlobalFilter`。
- `src/platform/observability/sentry/with-sentry-isolation.ts`: isolates cron / queue / event
  scopes.
  隔离定时任务、队列和事件的作用域。
- `src/platform/observability/sentry/sentry-privacy.ts`: defines the deny-by-default telemetry
  privacy boundary.
  定义默认拒绝采集的遥测隐私边界。
- `src/platform/observability/sentry/sentry-shutdown.ts`: closes pending telemetry within the
  final shutdown budget.
  在最终关停预算内关闭待发送遥测和 SDK 资源。
- `src/examples/demo-sentry/`: status and debug endpoints.
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
- `NODE_ENV=test` and `NODE_ENV=provision` never initialize Sentry; the status
  endpoint uses the same gate as `src/instrument.ts`.
  `NODE_ENV=test` 与 `NODE_ENV=provision` 都不会初始化 Sentry；状态端点与
  `src/instrument.ts` 使用同一判断条件。
- Without `SENTRY_TRACES_SAMPLE_RATE`, development uses `1` and production uses
  `0.1`.
  未设置 `SENTRY_TRACES_SAMPLE_RATE` 时，开发环境为 `1`，生产环境为 `0.1`。
- `src/instrument.ts` loads the same environment-file precedence as
  `ConfigModule` before reading `process.env`; runtime values still win.
  `src/instrument.ts` 会先加载与 `ConfigModule` 相同优先级的环境文件，运行时值
  仍具有最高优先级。
- `SENTRY_ENABLED` is case-insensitive (`false`, `FALSE`, and equivalent casing
  all disable init). Sample rate must be a finite number from `0` through `1`;
  invalid values fail before `Sentry.init`.

## Data Privacy / 数据隐私

The default integration keeps error identity, stack traces, HTTP method and URL
pathname, but does not send request or response headers, cookies, bodies, query
parameters, user identity, breadcrumbs, GraphQL documents or variables,
generative-AI inputs or outputs, database query values, local variables, or
source context lines. HTTP span URLs and descriptions have query strings and
fragments removed; absolute URL userinfo credentials are removed as well, and
sensitive span attributes are discarded.

默认集成保留错误标识、堆栈、HTTP 方法和 URL pathname，但不发送请求或响应
header、Cookie、body、query 参数、用户身份、breadcrumb、GraphQL
文档或变量、生成式 AI 输入输出、数据库查询值、局部变量及源码上下文行。
HTTP span 的 URL 与描述会移除 query string 和 fragment，敏感 span 属性会被丢弃。
绝对 URL 中的 userinfo 凭据也会被移除。

This is enforced twice: explicit SDK `dataCollection` settings prevent capture,
and `beforeSend` hooks scrub the final error, transaction and span payloads.
Applications that need additional telemetry must review its data classification
and change the shared privacy policy deliberately.

该契约通过两层机制执行：显式 SDK `dataCollection` 设置阻止采集，
`beforeSend` hooks 再清理最终 error、transaction 与 span payload。
若业务确需额外遥测，必须先审查数据分类，再显式修改共享隐私策略。

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
By default, the helper also captures a synchronous throw or asynchronous
rejection once and then preserves the original failure for the scheduler or
queue runtime. Synchronous events emitted by HTTP handlers disable helper-level
capture so the HTTP exception filter remains the single capture boundary.

用 `withSentryIsolation()` 包裹定时任务、队列和事件处理，避免后台任务的
breadcrumb / tag 泄漏到无关的 HTTP 错误事件。
该辅助函数默认还会对同步异常或异步拒绝上报一次，随后保留原异常交给调度器或队列
运行时。由 HTTP 处理器同步触发的事件会关闭辅助函数层的上报，让 HTTP 异常过滤器
保持为唯一上报边界。

This template already does that in:

本模板已在以下位置使用：

- `platform/runtime/schedule/schedule.service.ts`
- `demo-queue.processor.ts`
- `demo-events.listener.ts`

## Graceful Shutdown / 优雅关停

The central shutdown coordinator calls `Sentry.close()` only after HTTP work
has drained and Nest provider hooks have completed. This flushes pending events,
disables the SDK, and releases its runtime resources. The close receives the
remaining 2-second telemetry budget and is also protected by the shared outer
deadline. An uninitialized SDK is a normal no-op; a timeout or SDK failure is
logged locally and never prevents the process from preserving its SIGINT,
SIGTERM, or startup-failure exit code.

中央关停协调器仅在 HTTP 工作 drain 且 Nest provider hooks 完成后调用
`Sentry.close()`。调用使用剩余的 2 秒 telemetry 预算，并受统一外层期限保护。
SDK 未初始化时正常跳过；超时或 SDK 错误只写本地日志，不改变退出码，也不阻塞退出。

## WebSocket / WebSocket

`APP_FILTER` registration does not apply to Nest gateways. The demo WebSocket
exception filter therefore calls `Sentry.captureException()` for unexpected
errors, while skipping `HttpException` / `WsException` control-flow cases.

`APP_FILTER` 不会作用到 Nest gateway。因此 demo WebSocket 异常过滤器会对
未预期错误调用 `Sentry.captureException()`，并跳过 `HttpException` /
`WsException` 这类控制流异常。

## Source Maps / Source Maps

The shipped production build deliberately emits no source maps, and
`verify:artifact` rejects any `*.map` file in `dist/`. If production stack
traces need symbolication, add a controlled build step that generates maps,
uploads them to Sentry, and removes them before the image is assembled. The
wizard can scaffold that separate workflow:

当前 production build 明确不生成 source map，`verify:artifact` 也会拒绝
`dist/` 中的任何 `*.map`。若生产堆栈需要符号化，应增加受控构建步骤：生成
map、上传到 Sentry，并在组装镜像前删除；下面的 wizard 可用于搭建这条独立流程：

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
pnpm run test -- src/platform/observability/sentry src/examples/demo-sentry src/examples/demo-websocket/demo-websocket-exception.filter.spec.ts
pnpm run build
```
