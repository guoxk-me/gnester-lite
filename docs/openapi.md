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
  route coverage, DTO metadata, response envelopes, cookie security, language
  headers, native health probes and CSRF contracts.

## Endpoints / 端点

```text
http://localhost:3000/docs
http://localhost:3000/docs-json
```

Application sessions declare `application-session` cookie security and 401;
admin operations also declare 403. Refresh declares the separate
`application-refresh` cookie scheme. The reusable Bearer scheme remains
available for future consumers. DTO classes belong to their business module and
compile with inline Swagger metadata. When CSRF is enabled, every unsafe
operation declares the fixed `X-XSRF-TOKEN` header and 403. Disabled protection
adds no CSRF requirement. Demo routes are excluded.

Application JSON response fields use camelCase. When a database query or an
external service uses another naming convention, construct the application
response with explicit field names at that boundary (for example,
`user_id` → `userId`). Do not recursively rename response keys in the HTTP
envelope or the browser client: identifiers, dictionary keys, and externally
defined string values must keep their meaning.

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
