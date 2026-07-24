# AsyncAPI / WebSocket API 文档

> CN: 文档文件，说明 asyncapi 的用途；EN: Documentation file explains the purpose of asyncapi.

Outside production, the template exposes AsyncAPI documents for the Socket.IO
demo (`nestjs-asyncapi`), plus a small HTML index that links to importable
JSON/YAML.

非生产环境为 Socket.IO 演示暴露 AsyncAPI 文档（`nestjs-asyncapi`），并提供链到
可导入 JSON/YAML 的简易 HTML 首页。

## Layout / 结构

- `src/common/asyncapi/asyncapi.config.ts`: `setupAsyncApi(app, nodeEnv, port)`.
- Called from `src/bootstrap/configure-application.ts` after OpenAPI setup.
  在共享启动编排中于 OpenAPI 之后调用。
- Demo gateway: `src/features/demo-websocket/` (namespace `/demo-websocket`).
  演示网关命名空间为 `/demo-websocket`。See also `docs/websocket.md`.

## Endpoints / 端点

Disabled when `NODE_ENV=production`.

`NODE_ENV=production` 时不注册。

```text
http://localhost:3000/async-api
http://localhost:3000/async-api-json
http://localhost:3000/async-api-yaml
```

| Route | Content |
|---|---|
| `/async-api` | Minimal HTML index with links to JSON/YAML |
| `/async-api-json` | AsyncAPI document as JSON |
| `/async-api-yaml` | AsyncAPI document as YAML |

Notes / 说明：

- Server entry targets `localhost:<PORT>` with pathname `/demo-websocket` and
  `socket.io` protocol; Bearer security is declared for authenticated rooms.
  服务端条目指向 `localhost:<PORT>`、路径 `/demo-websocket`、协议 `socket.io`，
  并声明 Bearer。
- The HTML index is hand-rolled on purpose: the upstream HTML generator had a
  Node 24 failure path; import endpoints remain the source of truth for tools.
  HTML 首页为手写，规避上游生成器在 Node 24 上的问题；工具应以 JSON/YAML 为准。
- Operational WebSocket behavior (auth, rooms, errors) lives in
  `docs/websocket.md`, not in this file.
  运行时行为见 `docs/websocket.md`。

## Verify / 验证

```bash
pnpm run test -- src/common/asyncapi/asyncapi.config.spec.ts
# with the app running outside production:
curl -sS http://localhost:3000/async-api-json | head
curl -sS http://localhost:3000/async-api-yaml | head
```
