# Cache / 缓存

This template uses Redis-backed [`@nestjs/cache-manager`](https://docs.nestjs.com/techniques/caching)
(`@keyv/redis`) for application cache, plus a thin `CacheService` and an HTTP
response cache interceptor.

本模板用 Redis（`@keyv/redis` + `@nestjs/cache-manager`）做应用缓存，并提供
薄封装 `CacheService` 与 HTTP 响应缓存拦截器。

## Layout / 结构

- `src/platform/infrastructure/cache/cache.module.ts`: owns `CacheModule.registerAsync`, the
  Keyv Redis store, `CacheService`, and `HttpCacheInterceptor`.
  集中注册 `CacheModule`、Keyv Redis store，并全局导出缓存服务与拦截器。
- `src/platform/infrastructure/cache/cache.service.ts`: `get` / `set` / `remember` / `del` /
  `clear`.
- `src/platform/infrastructure/cache/http-cache.interceptor.ts`: GET-only track keys with
  `authorization` / `x-tenant-id` vary hashing.
  仅缓存 GET；按 `authorization` / `x-tenant-id` 做 vary 哈希。
- `src/examples/demo-cache/`: CRUD-style demo over `CacheService`.
  基于 `CacheService` 的读写演示。

## Configuration / 配置

YAML (`config/config.yaml`):

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
  style for demos; set a positive value in real services.
  `cache.ttl` 是省略 `ttl` 时的默认毫秒过期。模板默认 `0` 便于演示“不过期”；
  真实服务应设正数。
- Redis is shared with BullMQ; use distinct key prefixes in app code
  (`demo-cache:...`) so cache features remain distinguishable. The Keyv
  namespace is derived from `app.name` and `NODE_ENV` as
  `<app-name>:<environment>:cache`, isolating applications and environments
  that share one Redis deployment.
  Redis 与 BullMQ 共用；业务键仍应自带前缀以区分功能。Keyv 命名空间由
  `app.name` 和 `NODE_ENV` 生成，格式为
  `<app-name>:<environment>:cache`，用于隔离共用同一 Redis 的应用与环境。
- `CommonCacheModule` is the single cache composition boundary; importing it
  registers the Redis-backed Nest cache and shared providers together.
  `CommonCacheModule` 是唯一缓存装配边界，导入后同时注册 Redis 缓存与共享
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

## Demo / 演示

Version-neutral routes (no `/v1` prefix) exercise both `CacheService` CRUD and
real HTTP response caching.

版本中立路由（无 `/v1` 前缀）同时演示 `CacheService` CRUD 与真实 HTTP 响应缓存。

```text
POST   /demo-cache
GET    /demo-cache
GET    /demo-cache/:key
PATCH  /demo-cache/:key
DELETE /demo-cache/:key
GET    /demo-cache/http-response/:variant
```

Body and path cache keys, plus HTTP cache variants, share the same contract:
1–64 characters using only letters, numbers, `:`, `_`, and `-`.
请求体与路径中的缓存键，以及 HTTP cache variant，均只接受 1–64 位字母、数字、
`:`, `_` 和 `-`。

The CRUD demo admits at most 100 tracked entries. Admission and index
publication are atomic across instances; updates to an existing key remain
allowed at capacity. Expired index members are removed during bounded listing,
and a rejected create retries once after that cleanup. A still-full cache
returns `409` without publishing a partial item. `GET /demo-cache` scans and
returns at most 100 entries.
CRUD 示例最多接纳 100 个索引条目。跨实例的容量准入与索引发布是原子的；达到容量时
仍可更新已有 key。过期索引成员会在有界列表读取时清理，被拒绝的创建会在清理后重试
一次。若缓存仍满，则返回 `409` 且不会发布部分条目。`GET /demo-cache` 最多扫描并
返回 100 条。

`GET /demo-cache/http-response/:variant` uses `HttpCacheInterceptor` with a
five-second TTL. Repeating the same URL and authorization/tenant vary headers
returns the cached `generatedAt`; changing a vary header creates a separate
entry. The interceptor delegates all Redis work to the same bounded
`CacheService`; a backend timeout resets the stalled transport and fails open
to the route handler. Cache-write failures are best effort and their logs omit
response bodies, URLs, and identity-derived cache keys.

Event-driven invalidation also appears in `docs/demo.md`
(`POST /demo-events/cache/invalidate`).

事件失效示例见 `docs/demo.md`（`POST /demo-events/cache/invalidate`）。

All cache/event mutations require the README CSRF cookie-jar/token flow when
`CSRF_ENABLED=true`.

## Verify / 验证

```bash
pnpm run test -- src/platform/infrastructure/cache/
pnpm run test -- src/examples/demo-cache/
```
