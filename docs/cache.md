# Cache / 缓存

This template uses Redis-backed [`@nestjs/cache-manager`](https://docs.nestjs.com/techniques/caching)
(`@keyv/redis`) for application cache, plus a thin `CacheService` and an HTTP
response cache interceptor.

本模板用 Redis（`@keyv/redis` + `@nestjs/cache-manager`）做应用缓存，并提供
薄封装 `CacheService` 与 HTTP 响应缓存拦截器。

## Layout / 结构

- `src/infra/cache/cache.module.ts`: owns `CacheModule.registerAsync`, the
  Keyv Redis store, `CacheService`, and `HttpCacheInterceptor`.
  集中注册 `CacheModule`、Keyv Redis store，并全局导出缓存服务与拦截器。
- `src/infra/cache/cache.service.ts`: `get` / `set` / `remember` / `del` /
  `clear`.
- `src/infra/cache/http-cache.interceptor.ts`: GET-only track keys with
  `authorization` / `x-tenant-id` vary hashing.
  仅缓存 GET；按 `authorization` / `x-tenant-id` 做 vary 哈希。
  基于 `CacheService` 的读写演示。

## Configuration / 配置

YAML (`src/config/config.yaml`):

```yaml
cache:
  ttl: 0
```

Env (required for the store):

```text
REDIS_URL
```

Notes / 说明：

- `cache.ttl` is the default millisecond TTL passed to `CacheService.set` when
  callers omit `ttl`. Template default `0` follows cache-manager “no expiry”
  style; choose a positive value for bounded business retention.
  `cache.ttl` 是省略 `ttl` 时的默认毫秒过期。模板默认 `0` 便于演示“不过期”；
  真实服务应设正数。
- Redis is shared with BullMQ; use distinct key prefixes in app code
  (`assistant:...`) so cache features remain distinguishable. The Keyv
  namespace is derived from `app.name` and `NODE_ENV` as
  `<app-name>:<environment>:cache`, isolating applications and environments
  that share one Redis deployment.
  Redis 与 BullMQ 共用；业务键仍应自带前缀以区分功能。Keyv 命名空间由
  `app.name` 和 `NODE_ENV` 生成，格式为
  `<app-name>:<environment>:cache`，用于隔离共用同一 Redis 的应用与环境。
- `CacheModule` is the single cache composition boundary; importing it
  registers the Redis-backed Nest cache and shared providers together.
  `CacheModule` 是唯一缓存装配边界，导入后同时注册 Redis 缓存与共享
  provider。
- The Redis client bounds connection setup and disables offline command
  buffering. Every cache operation also has a three-second availability
  deadline; a silent connected transport is destroyed at that boundary so its
  pending command cannot accumulate. Readiness requests the stricter one-second
  budget. Healthy idle sockets are not closed.
  Redis 客户端限制建连时间并禁用离线命令排队。每次缓存操作另有三秒可用性期限；
  已连接但无响应的传输会在期限到达时被销毁，避免挂起命令持续累积。Readiness
  使用更严格的一秒期限，健康的空闲 socket 不会被关闭。

## Usage / 用法

Inject `CacheService` in any feature module (global export):

```ts
await this.cacheService.set('user:42', profile, 60_000);
const profile = await this.cacheService.remember('user:42', () => loadUser(42));
await this.cacheService.del('user:42');
```

For HTTP response caching, apply Nest’s cache decorators with the shared
interceptor:

```ts
@UseInterceptors(HttpCacheInterceptor)
@CacheTTL(5_000)
@Get('report')
getReport() { /* ... */ }
```

`HttpCacheInterceptor` only tracks `GET` and builds keys like
`http:GET:<url>` or `http:GET:<url>:vary:<sha256>` when vary headers are
present.

`HttpCacheInterceptor` 只跟踪 `GET`；有 vary 头时在键上附加 sha256。

## Verification / 验证

```bash
pnpm run test -- src/infra/cache
```

`test:full-app` 验证真实 Redis，仅指向可丢弃的基础设施。
