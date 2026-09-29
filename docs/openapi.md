# OpenAPI / HTTP API 文档

The development application mounts Swagger UI and an OpenAPI JSON document via
`@nestjs/swagger`. Documentation routes are not registered in test, provisioning,
or production environments.

开发环境通过 `@nestjs/swagger` 挂载 Swagger UI 和 OpenAPI JSON；测试、基础设施
集成及生产环境均不注册文档路由。

## Metadata lifecycle / 元数据生命周期

`nest-cli.json` enables the Nest Swagger plugin in the TypeScript builder.
DTO metadata is emitted inline in the compiled ESM files under `dist/src`;
no generated `src/metadata.ts` is loaded.

`nest-cli.json` 在 TypeScript 构建器中启用 Nest Swagger 插件。DTO 元数据
直接写入 `dist/src` 的 ESM 产物，不再生成或加载 `src/metadata.ts`。

Key files:

- `src/bootstrap/http/openapi.config.ts`: development-only setup and document generation. When CSRF is enabled, it also adds the configured CSRF header and a
  `403` response to every `POST`, `PUT`, `PATCH`, and `DELETE` operation.
- `src/bootstrap/configure-application.ts`: invokes setup after URI versioning.
- `scripts/verify-openapi-document.mjs`: verifies the compiled document’s
  authentication, serialization, streaming, multipart, cookie/session header,
  and configurable CSRF contracts.

## Endpoints / 端点

```text
http://localhost:3000/docs
http://localhost:3000/docs-json
```

Bearer authentication is registered globally for the UI. Guarded auth and
authorization routes explicitly declare bearer security plus `401`/`403`
responses; login declares validation, authentication, and rate-limit failures.
DTO schemas are generated from TypeScript and class-validator metadata.
The unsafe-operation CSRF contract follows `CSRF_ENABLED` and
`CSRF_HEADER_NAME`: disabled protection adds no CSRF requirement, while enabled
protection uses the configured header name (default `x-csrf-token`).

Compodoc (`pnpm run compodoc`) describes module and class structure; it does not
replace the HTTP contract.

## Verify / 验证

```bash
pnpm run build
pnpm run verify:openapi
pnpm run test -- src/bootstrap/http/openapi.config.spec.ts

# With the development app running:
curl -fsS -o /dev/null http://localhost:3000/docs
curl -fsS http://localhost:3000/docs-json
```
