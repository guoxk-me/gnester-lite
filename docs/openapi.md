# OpenAPI / HTTP API 文档

> CN: 文档文件，说明 openapi 的用途；EN: Documentation file explains the purpose of openapi.

Outside production, the template mounts Swagger UI and a JSON document for HTTP
APIs via `@nestjs/swagger`.

非生产环境通过 `@nestjs/swagger` 挂载 Swagger UI 与 JSON 文档。

## Layout / 结构

- `src/common/openapi/openapi.config.ts`: `setupOpenApi(app, nodeEnv)`.
- Called from `src/main.ts` after URI versioning is enabled.
  在 `src/main.ts` 启用 URI 版本后再调用。

## Endpoints / 端点

Disabled when `NODE_ENV=production`.

`NODE_ENV=production` 时不注册。

```text
http://localhost:3000/docs
http://localhost:3000/docs-json
```

Notes / 说明：

- Document title: `gnester-lite API` / version `1.0`.
- Bearer auth scheme is registered (`addBearerAuth`) so the UI can persist a
  JWT (`persistAuthorization: true`).
  已注册 Bearer，UI 可持久化 JWT。
- Controllers that omit Swagger decorators still appear with inferred routes;
  richer schemas need `@Api*` annotations when you want typed request bodies.
  未加 `@Api*` 的控制器仍会出现推断路由；需要类型化请求体时再补注解。
- Compodoc (`pnpm run compodoc`) documents module/class structure; it does not
  replace OpenAPI.
  Compodoc 描述代码结构，不替代 OpenAPI。

## Verify / 验证

```bash
pnpm run test -- src/common/openapi/openapi.config.spec.ts
# with the app running outside production:
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/docs
curl -sS http://localhost:3000/docs-json | head
```
