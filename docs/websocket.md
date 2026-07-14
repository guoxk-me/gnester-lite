# WebSocket Demo / WebSocket 示例

> CN: 文档文件，说明 websocket 的用途；EN: Documentation file explains the purpose of websocket.

This project uses NestJS gateways with the Socket.IO platform package for the
demo websocket feature.

本项目的 WebSocket 示例使用 NestJS gateway 和 Socket.IO platform package。

## Files / 文件

- `src/features/demo-websocket/demo-websocket.module.ts`
- `src/features/demo-websocket/demo-websocket.gateway.ts`
- `src/features/demo-websocket/demo-websocket.service.ts`
- `src/features/demo-websocket/dto/*.ts`

## Install / 依赖

```bash
pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
pnpm add -D socket.io-client
```

## Namespace / 命名空间

The gateway listens on the main HTTP server under this Socket.IO namespace:

Gateway 复用主 HTTP server，并监听这个 Socket.IO namespace：

```text
/demo-websocket
```

## Adapter / 适配器

NestJS WebSocket support is platform-agnostic. This project uses a custom
Socket.IO adapter that extends `IoAdapter`, following the NestJS adapter
extension pattern.

NestJS WebSocket 支持是平台无关的。本项目使用一个继承 `IoAdapter` 的自定义
Socket.IO adapter，符合 NestJS 官方 adapter 扩展模式。

Files / 文件：

- `src/common/websocket/demo-socket-io.adapter.ts`
- `src/main.ts`

The adapter is registered during bootstrap:

Adapter 在启动阶段注册：

```ts
app.useWebSocketAdapter(new DemoSocketIoAdapter(app));
```

The adapter centralizes Socket.IO server defaults:

Adapter 集中管理 Socket.IO server 默认选项：

- `transports: ['websocket']`
- `serveClient: false`
- default local CORS origins when a gateway does not provide `cors`

- `transports: ['websocket']`
- `serveClient: false`
- 当 gateway 未提供 `cors` 时使用默认本地 CORS origins

Local development origins are allowed explicitly:

本地开发 origin 已显式放行：

- `http://localhost:3000`
- `http://localhost:5173`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:5173`

Production deployments should replace this static allow-list with the real
browser origins or a custom adapter that reads from configuration.

生产部署时应将该静态 allow-list 替换为真实浏览器 origin，或使用从配置读取的自定义 adapter。

For multiple load-balanced instances, extend this adapter with the Socket.IO
Redis adapter. Redis alone is not enough when long polling is enabled; this demo
uses websocket-only transport to avoid sticky polling sessions.

多实例负载均衡部署时，应在此 adapter 上扩展 Socket.IO Redis adapter。启用 long
polling 时仅有 Redis 不够；本示例使用 websocket-only transport，避免 polling 粘性会话问题。

## Authentication / 认证

Clients must send a JWT access token during the Socket.IO handshake:

客户端必须在 Socket.IO handshake 阶段发送 JWT access token：

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/demo-websocket', {
  auth: {
    token: '<accessToken>',
  },
});
```

The gateway also accepts `Authorization: Bearer <token>` from handshake
headers for non-browser clients.

Gateway 也接受非浏览器客户端在 handshake headers 中传入
`Authorization: Bearer <token>`。

Anonymous or invalid clients receive:

匿名或无效 token 客户端会收到：

```json
{
  "code": "WEBSOCKET_UNAUTHORIZED",
  "message": "Unauthorized websocket connection"
}
```

Then the server disconnects the socket.

随后服务端会断开 socket。

## Events / 事件

Client to server / 客户端到服务端：

- `demo-websocket.scenarios`: returns documented demo scenarios.
- `demo-websocket.ping`: validates an authenticated connection and emits
  `demo-websocket.pong`.
- `demo-websocket.room.join`: joins a validated room name.
- `demo-websocket.message`: broadcasts a validated message to a room.

Server to client / 服务端到客户端：

- `demo-websocket.scenarios`
- `demo-websocket.pong`
- `demo-websocket.room.joined`
- `demo-websocket.message`
- `demo-websocket.error`

Ping example / Ping 示例：

```ts
socket.on('demo-websocket.pong', (payload) => {
  console.log(payload);
});

socket.emit('demo-websocket.ping', {
  message: 'alive',
});
```

Room example / 房间示例：

```ts
socket.emit('demo-websocket.room.join', {
  room: 'demo-room',
});

socket.on('demo-websocket.message', (payload) => {
  console.log(payload);
});

socket.emit('demo-websocket.message', {
  room: 'demo-room',
  message: 'hello',
});
```

## Validation / 校验

The gateway uses a WebSocket-specific validation pipe registered with
`@UsePipes(createDemoWebsocketValidationPipe())`. This follows NestJS WebSocket
pipe behavior: pipes apply to the socket message `data` parameter, and
validation failures throw `WsException` instead of `HttpException`.

Gateway 使用通过 `@UsePipes(createDemoWebsocketValidationPipe())` 注册的
WebSocket 专用 validation pipe。这符合 NestJS WebSocket pipe 行为：pipe 作用于
socket message 的 `data` 参数，校验失败抛 `WsException` 而不是 `HttpException`。

The pipe keeps the same validation policy as HTTP routes:

该 pipe 保持与 HTTP route 相同的校验策略：

- whitelist unknown fields.
- reject non-whitelisted fields.
- transform DTO payloads.
- return structured validation errors through `demo-websocket.exception`.

Room names allow only letters, numbers, `:`, `_`, and `-`.

房间名只允许字母、数字、`:`, `_`, `-`。

## Exception Filter / 异常过滤器

NestJS WebSocket handlers should throw `WsException` for socket-specific
application errors. The demo gateway also registers
`DemoWebsocketExceptionFilter` with `@UseFilters()` so validation failures and
unexpected errors use one stable event:

NestJS WebSocket handler 应使用 `WsException` 表达 socket 业务异常。示例 gateway
也通过 `@UseFilters()` 注册 `DemoWebsocketExceptionFilter`，让校验失败和未知异常都使用
同一个稳定事件：

```text
demo-websocket.exception
```

Validation failure example / 校验失败示例：

```json
{
  "code": "WEBSOCKET_VALIDATION_FAILED",
  "message": "Validation failed",
  "errors": [
    {
      "field": "room",
      "reason": "room must match /^[a-zA-Z0-9:_-]+$/ regular expression"
    }
  ]
}
```

Application exception example / 业务异常示例：

```ts
throw new WsException({
  code: 'WEBSOCKET_UNAUTHORIZED',
  message: 'Unauthorized websocket event',
});
```

Unexpected errors are intentionally normalized to avoid leaking internals:

未知异常会被归一化，避免向客户端泄漏内部细节：

```json
{
  "code": "WEBSOCKET_INTERNAL_ERROR",
  "message": "Internal websocket error"
}
```

## Guards / 守卫

The gateway registers `DemoWebsocketAuthenticatedGuard` with `@UseGuards()` at
the gateway level. This follows NestJS WebSocket guard behavior: guards work
like HTTP guards, but socket-specific failures should throw `WsException`.

Gateway 在 class 层通过 `@UseGuards()` 注册 `DemoWebsocketAuthenticatedGuard`。
这符合 NestJS WebSocket guard 行为：guard 机制与 HTTP guard 一致，但 socket
场景下的失败应抛 `WsException`。

The guard protects subscribed message handlers by requiring
`client.data.user`, which is set during the authenticated handshake in
`handleConnection()`.

该 guard 保护已订阅的 message handler，要求 `client.data.user` 存在；这个 user
上下文由 `handleConnection()` 中的已认证 handshake 写入。

Unauthorized event example / 未认证事件示例：

```json
{
  "code": "WEBSOCKET_UNAUTHORIZED",
  "message": "Unauthorized websocket event"
}
```

Handshake authentication and event authorization are intentionally separate:

Handshake 认证与事件授权刻意分离：

- `handleConnection()`: verifies the JWT and rejects unauthenticated sockets.
- `DemoWebsocketAuthenticatedGuard`: verifies authenticated socket context
  before event handlers execute.

- `handleConnection()`：校验 JWT，并拒绝未认证 socket。
- `DemoWebsocketAuthenticatedGuard`：在事件 handler 执行前校验 socket 上下文。

## Interceptors / 拦截器

The gateway registers `DemoWebsocketResponseInterceptor` with
`@UseInterceptors()`. This follows NestJS WebSocket interceptor behavior:
interceptors wrap subscribed message handlers and can observe or transform the
handler response stream.

Gateway 通过 `@UseInterceptors()` 注册 `DemoWebsocketResponseInterceptor`。
这符合 NestJS WebSocket interceptor 行为：interceptor 包裹已订阅的 message
handler，可以观察或转换 handler 的响应流。

The demo interceptor intentionally does not rewrite business responses. It
passes `{ event, data }` through unchanged and emits a side-channel trace event
to the same socket:

示例 interceptor 刻意不改写业务响应。它原样透传 `{ event, data }`，并向同一个
socket 额外发送旁路 trace 事件：

```text
demo-websocket.intercepted
```

Trace payload / Trace payload：

```json
{
  "event": "demo-websocket.pong",
  "socketId": "<socket-id>",
  "userId": "demo-admin"
}
```

This keeps the user-facing event contract stable while still demonstrating
gateway-scoped interceptor behavior.

这样可以保持面向客户端的业务事件契约稳定，同时演示 gateway class 层 interceptor
行为。

## Production Notes / 生产注意事项

- Keep JWT verification in the handshake path before registering connection
  state.
- Validate every inbound event payload. WebSocket messages are user input.
- Define connection budgets separately from HTTP rate limiting.
- For multiple server instances, add the Socket.IO Redis adapter so room
  broadcasts cross process boundaries.
- Keep the WebSocket origin allow-list aligned with browser client deployment
  origins.

- 在登记连接状态前完成 JWT 校验。
- 校验每个入站事件 payload。WebSocket 消息也是用户输入。
- 单独定义连接预算，不要假设 HTTP rate limit 会覆盖长连接。
- 多实例部署时接入 Socket.IO Redis adapter，让房间广播跨进程生效。
- WebSocket origin allow-list 要与浏览器客户端部署 origin 保持一致。

## Verification / 验证

Focused unit tests:

```bash
pnpm run test -- src/features/demo-websocket/demo-websocket.service.spec.ts src/features/demo-websocket/demo-websocket.gateway.spec.ts
```

Socket.IO e2e test:

```bash
pnpm run test:e2e -- websocket.e2e-spec.ts
```
