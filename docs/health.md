# Health / 健康检查

This template exposes Terminus-based liveness and readiness probes for
deployment platforms (Kubernetes, load balancers, PaaS health checks).

本模板基于 Terminus 提供存活与就绪探针，供 Kubernetes、负载均衡或 PaaS
健康检查使用。

## Layout / 结构

- `src/platform/operations/health/health.module.ts`: imports `TerminusModule` and registers
  the controller.
  引入 `TerminusModule` 并注册控制器。
- `src/platform/operations/health/health.controller.ts`: `GET /health/live` and
  `GET /health/ready`.
  暴露 `GET /health/live` 与 `GET /health/ready`。
- `src/platform/operations/health/application-readiness.service.ts`: owns the irreversible
  ready-to-draining transition used by graceful shutdown.
  管理优雅关停期间不可逆的 ready→draining 状态。
- Wired from `src/app.module.ts` via `CommonHealthModule`.
  由 `src/app.module.ts` 通过 `CommonHealthModule` 接入。

## Endpoints / 端点

Paths are **version-neutral** (`VERSION_NEUTRAL`), so they are not under
`/v1/...`.

路径使用 **VERSION_NEUTRAL**，不带 `/v1/...` 前缀。

```text
GET /health/live
GET /health/ready
```

| Route           | Purpose               | Checks                                                          |
| --------------- | --------------------- | --------------------------------------------------------------- |
| `/health/live`  | Process is up         | In-process `app: up` only（不探依赖）                           |
| `/health/ready` | Ready to take traffic | Application not draining, sanitized database ping, Redis `PING` |

Example readiness success body (shape from `@nestjs/terminus`):

```json
{
  "status": "ok",
  "info": {
    "application": { "status": "up" },
    "database": { "status": "up" },
    "redis": { "status": "up" }
  },
  "error": {},
  "details": {
    "application": { "status": "up" },
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

## Notes / 说明

- Liveness must stay cheap: do not add Redis/queue checks there, or a dependency
  blip can restart a healthy process.
  存活探针应保持轻量：不要把 Redis/队列检查放在 live，避免依赖抖动导致误重启。
- On the first SIGINT/SIGTERM, readiness immediately returns `503` while
  liveness remains `200`. Dependency checks are skipped in this draining state.
  The application waits for the configured propagation delay before closing
  HTTP admission, so load balancers can remove the instance first.
  首个 SIGINT/SIGTERM 到达后，readiness 立即返回 `503`，liveness 仍为 `200`；
  draining 状态不再探测依赖。应用等待配置的传播窗口后才停止 HTTP 接流。
- Database and Redis failures are reduced to `Database ping failed` and
  `Redis ping failed`; raw driver or connection details are never included in
  the public readiness body.
- Database and Redis failures emit an internal structured warning containing
  only the application fields `event`, `dependency`, a closed-set
  `failureClass`, `isTimeout`, `durationMs`, and `failureCount`. Raw errors,
  driver codes, URLs, usernames, passwords, and connection details are never
  attached to this event.
- Failures are logged at most once per dependency every 60 seconds, including
  when the observed failure class changes. The first healthy probe after a
  recorded outage emits one structured recovery event; outages suppressed by
  the active window do not emit standalone recovery noise. Rapid flapping is
  therefore bounded to one failure/recovery pair per interval, while
  continuously healthy probes remain silent. Terminus's default per-failure
  logger is disabled so it cannot bypass this limit.
- Concurrent callers share one timed ping result per dependency. Database
  readiness uses a dedicated pooled connection with the same mysql2 query
  timeout. A query that exceeds the total one-second budget destroys its
  connection; a queued acquisition remains single-flight and releases a late
  connection before another attempt can start.
- nestjs-pino skips automatic access logs only for exact `/health/live` and
  `/health/ready` paths (`src/platform/observability/logger/logger.config.ts`).
- Both infrastructure probes use `@SkipHttpThrottle()`, which bypasses every
  configured HTTP throttler without coupling the probe to throttler names.
- Rate-limit demo also has `GET /demo-rate-limit/health` with
  `@SkipHttpThrottle()`;
  that is a throttling demo route, not the Terminus probe.
  `GET /demo-rate-limit/health` 是限流演示（`@SkipHttpThrottle()`），不是 Terminus
  探针。

## Verify / 验证

```bash
pnpm run test -- src/platform/operations/health/health.controller.spec.ts
curl -sS http://localhost:3000/health/live
curl -sS http://localhost:3000/health/ready
```
