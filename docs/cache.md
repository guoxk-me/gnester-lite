# Cache / 缓存

> CN: 文档文件，说明 cache 的用途；EN: Documentation file explains the purpose of cache.

This template uses Redis-backed [`@nestjs/cache-manager`](https://docs.nestjs.com/techniques/caching)
(`@keyv/redis`) for application cache, plus a thin `CacheService` and an HTTP
response cache interceptor.

本模板用 Redis（`@keyv/redis` + `@nestjs/cache-manager`）做应用缓存，并提供
薄封装 `CacheService` 与 HTTP 响应缓存拦截器。

## Layout / 结构

- `src/app.module.ts`: `CacheModule.registerAsync` with Keyv Redis store and
  YAML `cache.ttl`.
  用 Keyv Redis store 与 YAML `cache.ttl` 注册全局 `CacheModule`。
- `src/common/cache/cache.module.ts`: `@Global()` exports `CacheService` and
  `HttpCacheInterceptor`.
  全局导出 `CacheService` 与 `HttpCacheInterceptor`。
- `src/common/cache/cache.service.ts`: `get` / `set` / `remember` / `del` /
  `clear`.
- `src/common/cache/http-cache.interceptor.ts`: GET-only track keys with
  `authorization` / `x-tenant-id` vary hashing.
  仅缓存 GET；按 `authorization` / `x-tenant-id` 做 vary 哈希。
- `src/features/demo-cache/`: CRUD-style demo over `CacheService`.
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
  (`demo-cache:...`) so cache keys do not collide with queue data.
  Redis 与 BullMQ 共用；业务键请自带前缀，避免与队列键冲突。
- `CommonCacheModule` does not re-register `CacheModule`; it assumes the root
  `CacheModule.registerAsync` already ran.
  `CommonCacheModule` 不再次注册 `CacheModule`，依赖根模块已装配。

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

Version-neutral routes (no `/v1` prefix) exercise `CacheService` CRUD only.
They do **not** mount `HttpCacheInterceptor` yet.

版本中立路由（无 `/v1` 前缀）只演示 `CacheService` CRUD，**尚未**挂载
`HttpCacheInterceptor`。

```text
POST   /demo-cache
GET    /demo-cache
GET    /demo-cache/:key
PATCH  /demo-cache/:key
DELETE /demo-cache/:key
```

Event-driven invalidation also appears in `docs/demo.md`
(`POST /demo-events/cache/invalidate`).

事件失效示例见 `docs/demo.md`（`POST /demo-events/cache/invalidate`）。

## Verify / 验证

```bash
pnpm run test -- src/common/cache/
pnpm run test -- src/features/demo-cache/
```
