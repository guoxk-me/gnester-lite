# AsyncAPI / WebSocket API 文档

The WebSocket feature owns a hand-maintained AsyncAPI 3.0 contract. No
documentation package is present in production dependencies: the application
serves the contract directly, while `@asyncapi/parser` is used only in tests.

WebSocket 功能模块自行维护 AsyncAPI 3.0 契约。生产依赖不包含文档生成包；应用直接
提供契约，`@asyncapi/parser` 仅用于测试校验。

## Layout / 结构

- `src/examples/demo-websocket/demo-websocket-asyncapi.service.ts` generates the
  document; the feature-owned version-neutral Nest controller serves HTML,
  JSON, and YAML through the normal router.
- `src/examples/demo-websocket/demo-websocket-asyncapi.service.spec.ts` validates
  the document with the official parser and checks channels and schemas against
  the gateway.
- `src/examples/demo-websocket/demo-websocket.module.ts` keeps documentation
  ownership beside the `/demo-websocket` namespace.
- Runtime authentication, rooms, errors, and adapter behavior are documented in
  `docs/websocket.md`.

## Endpoints / 端点

The endpoints are available in non-production demo environments and are absent
when `NODE_ENV=production`.

```text
http://localhost:3000/async-api
http://localhost:3000/async-api-json
http://localhost:3000/async-api-yaml
```

| Route             | Content                                         |
| ----------------- | ----------------------------------------------- |
| `/async-api`      | Small index linking to the importable documents |
| `/async-api-json` | AsyncAPI 3.0 JSON                               |
| `/async-api-yaml` | AsyncAPI 3.0 YAML                               |

The server entry uses Engine.IO pathname `/socket.io/` and declares the Socket.IO
namespace separately as `x-socket-io-namespace: /demo-websocket`. Bearer
authentication is declared for the handshake. Room-message operations state
that the sender must join the target room first. An optional ping message must
contain non-whitespace text and is limited to 120 characters when present. The
payload-free scenarios request is represented by an explicit message with no
`payload`, so tooling cannot confuse the scenarios response with client input.
The JSON/YAML documents are the source of truth for tooling.

## Verify / 验证

```bash
pnpm run test -- src/examples/demo-websocket/demo-websocket-asyncapi.service.spec.ts

# With the development app running:
curl -fsS http://localhost:3000/async-api-json
curl -fsS http://localhost:3000/async-api-yaml
```
