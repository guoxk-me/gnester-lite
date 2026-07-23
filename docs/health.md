# Health / 健康检查

> CN: 文档文件，说明 health 的用途；EN: Documentation file explains the purpose of health.

This template exposes Terminus-based liveness and readiness probes for
deployment platforms (Kubernetes, load balancers, PaaS health checks).

本模板基于 Terminus 提供存活与就绪探针，供 Kubernetes、负载均衡或 PaaS
健康检查使用。

## Layout / 结构

- `src/common/health/health.module.ts`: imports `TerminusModule` and registers
  the controller.
  引入 `TerminusModule` 并注册控制器。
- `src/common/health/health.controller.ts`: `GET /health/live` and
  `GET /health/ready`.
  暴露 `GET /health/live` 与 `GET /health/ready`。
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

| Route | Purpose | Checks |
|---|---|---|
| `/health/live` | Process is up | In-process `app: up` only（不探依赖） |
| `/health/ready` | Ready to take traffic | TypeORM `pingCheck('database')` |

Example readiness success body (shape from `@nestjs/terminus`):

```json
{
  "status": "ok",
  "info": { "database": { "status": "up" } },
  "error": {},
  "details": { "database": { "status": "up" } }
}
```

## Notes / 说明

- Liveness must stay cheap: do not add Redis/queue checks there, or a dependency
  blip can restart a healthy process.
  存活探针应保持轻量：不要把 Redis/队列检查放在 live，避免依赖抖动导致误重启。
- Readiness may grow (Redis, queue) when the service truly cannot serve without
  them; keep the contract explicit in this doc when extending.
  若业务离开 Redis/队列无法服务，可扩展 ready；扩展时同步更新本文。
- nestjs-pino skips automatic access logs for URLs containing `/health`
  (`src/common/logger/logger.config.ts`).
  nestjs-pino 对 URL 含 `/health` 的请求跳过自动 access log。
- Rate-limit demo also has `GET /demo-rate-limit/health` with `@SkipThrottle()`;
  that is a throttling demo route, not the Terminus probe.
  `GET /demo-rate-limit/health` 是限流演示（`@SkipThrottle()`），不是 Terminus
  探针。

## Verify / 验证

```bash
pnpm run test -- src/common/health/health.controller.spec.ts
curl -sS http://localhost:3000/health/live
curl -sS http://localhost:3000/health/ready
```
