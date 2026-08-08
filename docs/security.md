# Security Utilities / 安全工具

This template keeps cryptographic primitives in `src/platform/security/crypto/` and application examples in `src/examples/demo-crypto/`.

本模板将通用加密能力放在 `src/platform/security/crypto/`，将应用示例放在 `src/examples/demo-crypto/`。

## Better Auth

The production authentication entry is Better Auth 1.6 at `/api/auth/*`.
`CommonBetterAuthModule` owns a Better Auth instance backed by a dedicated
`mysql2` pool, with email/password authentication and opaque cookie sessions
enabled.

生产认证入口为 `/api/auth/*` 下的 Better Auth 1.6。它使用独立 `mysql2` 连接池，
启用邮箱密码认证与不透明 cookie session。

Common endpoints / 常用端点：

- `POST /api/auth/sign-up/email`
- `POST /api/auth/sign-in/email`
- `GET /api/auth/get-session`
- `POST /api/auth/sign-out`

Runtime boundary / 运行时边界：

- Nest starts with `bodyParser: false`. The auth-only middleware passes the raw
  request stream directly to Better Auth before JSON or URL-encoded parsing.
  Declared bodies over 1 MiB are rejected; the production ingress must enforce
  the same cap for streamed requests without a content length.
- The private client-IP header is overwritten from Express `request.ip`, so
  Better Auth uses the same validated `trust proxy` result as the Nest
  throttler. Its built-in limiter follows `rateLimit.enabled` and remains
  in-memory; multi-instance deployments need shared Better Auth rate-limit
  storage.
- Project `csrf-csrf` middleware skips only the exact `/api/auth` boundary.
  Better Auth keeps its own Origin, Fetch Metadata, redirect, and CSRF checks.
- Production cookies are forced `Secure`; every production `BETTER_AUTH_URL`
  and trusted origin must use HTTPS and must not be a loopback origin. The
  artifact smoke uses a non-loopback logical origin while connecting to the
  disposable loopback server, matching a TLS-terminating reverse proxy.
- Better Auth routes are handled before Nest controllers and therefore are not
  described by the Nest OpenAPI document or protected by Nest guards. Protect
  business controllers by resolving a Better Auth session through
  `BetterAuthService`; do not assume sign-in automatically protects every Nest
  route.

Required production configuration / 生产必填配置：

```text
BETTER_AUTH_SECRET=<independent high-entropy value, at least 32 bytes>
BETTER_AUTH_URL=https://api.example.com
BETTER_AUTH_TRUSTED_ORIGINS=https://app.example.com
```

`BETTER_AUTH_TRUSTED_ORIGINS` is optional when enabled credentialed CORS origins
are the same browser applications. A disabled or non-credentialed CORS origin is
never promoted into Better Auth's trust boundary. Wildcards are rejected.

This baseline keeps Better Auth's default self-service sign-up behavior:
registration is open, email verification is not required, and a successful
sign-up creates a session immediately. Before treating email ownership as a
trusted business fact, connect a mail sender and require verification, or close
public sign-up with an application-specific enrollment policy.

The existing JWT/Passport and authorization examples live under removable Demo
features. Their bearer tokens are intentionally independent from Better Auth's
cookie identity; neither credential authenticates the other system.

现有 JWT/Passport 与授权能力仍属于可移除 Demo。JWT bearer token 与 Better Auth
cookie 身份互不兼容，也不会相互认证。

## Password Hashing / 密码哈希

Use `PasswordHashService` from `src/platform/security/auth/password-hash.service.ts` for passwords.

密码使用 `src/platform/security/auth/password-hash.service.ts` 中的 `PasswordHashService`。

- Passwords are never encrypted for later recovery.
- Store only salted hashes.
- Verify with the service instead of comparing plaintext.

## Recoverable Secrets / 可恢复密钥

Use `SymmetricEncryptionService` for data that must be decrypted later, such as OAuth refresh tokens, third-party API tokens, or private provider settings.

需要后续解密的数据使用 `SymmetricEncryptionService`，例如 OAuth refresh token、第三方 API token 或私密供应商配置。

- Algorithm: `aes-256-gcm`.
- Payload format: `v1:aes-256-gcm:<iv>:<authTag>:<ciphertext>`.
- Pass an authenticated context such as tenant id, user id, or purpose when encrypting and decrypting.
- Set `ENCRYPTION_KEY` to a base64url-encoded 32-byte key in production.

Generate a local key:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

## One-Time Tokens / 一次性 Token

Use `SecureTokenService` for reset links, email verification, invites, and API keys that are shown only once.

重置链接、邮箱验证、邀请链接、只展示一次的 API key 使用 `SecureTokenService`。

- Send the raw token to the user once.
- Store `hashToken(token)` in the database.
- Later verify with `verifyToken(token, storedDigest)`.

## Payload Signatures / Payload 签名

Use `HmacSignatureService` for webhook signing, callback verification, and internal service payload signatures.

Webhook 签名、回调校验、内部服务 payload 签名使用 `HmacSignatureService`。

- Sign the exact raw payload string.
- Verify before parsing or acting on the payload.
- Set `HMAC_SECRET` in production.

## CSRF Protection / CSRF 防护

Use `CsrfService` from `src/platform/security/csrf/csrf.service.ts` for browser clients
that authenticate through cookies or sessions.

浏览器客户端通过 cookie 或 session 自动携带凭证时，使用
`src/platform/security/csrf/csrf.service.ts` 中的 `CsrfService`。

- Implementation: `csrf-csrf`, registered globally in
  `src/bootstrap/configure-application.ts`.
- Token endpoint demo: `GET /demo-csrf/token`.
- Unsafe methods (`POST`, `PUT`, `PATCH`, `DELETE`) must send the token in
  the `CSRF_HEADER_NAME` header (default `x-csrf-token`). Development OpenAPI
  uses the configured name and only declares this requirement while CSRF is
  enabled.
- Missing or invalid tokens return
  `{ code: 403, message: "Invalid CSRF token", data: null, errors: null }`.
  `message` follows `Accept-Language` (`en` / `zh`).
- Set `CSRF_SECRET` in production when `CSRF_ENABLED=true`.

Typical flow / 典型流程：

```bash
COOKIE_JAR="$(mktemp)"
TOKEN_RESPONSE="$(curl -fsS -c "$COOKIE_JAR" http://localhost:3000/demo-csrf/token)"
CSRF_TOKEN="$(printf '%s' "$TOKEN_RESPONSE" | node -pe 'JSON.parse(require("node:fs").readFileSync(0, "utf8")).data.csrfToken')"

curl -fsS -b "$COOKIE_JAR" \
  -H 'content-type: application/json' \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -d '{"recipient":"alice@example.com","amount":25}' \
  http://localhost:3000/demo-csrf/transfer-preview
```

The middleware in this template protects every unsafe HTTP method while
`CSRF_ENABLED=true`, including demo endpoints that otherwise use bearer
authentication. Use the cookie-jar/token flow above for all documented
`POST`/`PUT`/`PATCH`/`DELETE` examples, or explicitly disable CSRF when deploying
a pure bearer-token API.

`/api/auth/*` is the deliberate exception to this project middleware: Better
Auth performs its own origin and CSRF checks at that raw-handler boundary. Do
not add a broad prefix match such as `/api/authentication` to the exception.

生产环境启用 CSRF 时必须使用 secure cookie。任何
`CSRF_COOKIE_SAME_SITE=none` 或已启用 session 的
`SESSION_COOKIE_SAME_SITE=none` 配置也必须同时开启对应的 secure 选项，否则
启动校验会拒绝该配置。

## Auth Guards / 鉴权守卫

The template exposes two HTTP guard adapters but one JWT trust policy:

| Consumer             | Adapter                                 | Canonical verification                 |
| -------------------- | --------------------------------------- | -------------------------------------- |
| `demo-auth`          | `JwtAuthGuard` + Passport `JwtStrategy` | `AuthTokenService` payload validation  |
| `demo-authorization` | `AuthGuard` + `@Public()` metadata      | `AuthTokenService.verifyAccessToken()` |
| `/demo-websocket`    | Socket.IO handshake                     | `AuthTokenService.verifyAccessToken()` |

- Login uses `LocalAuthGuard` + `LocalStrategy` in `demo-auth`.
  登录在 `demo-auth` 使用 `LocalAuthGuard` + `LocalStrategy`。
- `demo-authorization` applies `AuthGuard` to the controller; only its
  `@Public()` scenario catalog bypasses authentication. Role, permission and
  policy guards run after that shared authentication boundary.
  `demo-authorization` 在 controller 级应用 `AuthGuard`；只有标记
  `@Public()` 的场景目录绕过鉴权，角色、权限与策略守卫均运行在该统一认证边界之后。
- `readJwtPolicy()` centralizes HS256, secret, issuer, audience, and TTL.
- All verification paths enforce expiry, issuer, audience, algorithm, and the
  same identity payload: `sub` and `username` are required; `roles` and
  `permissions` are optional, but every supplied entry must be a non-empty
  string.
- HTTP, Passport, and the WebSocket header fallback share one strict
  case-insensitive Bearer extractor. Extra whitespace or token segments are
  rejected, and token input is capped at 4096 characters before JWT parsing.
- Local authentication always performs one scrypt verification, including for
  unknown usernames, to avoid a missing-user fast path.
- Session login regenerates the server-side session identifier before writing
  authenticated state. Regeneration failures do not upgrade the old session.
- The cookie demo reflects only `demo_preferences`; arbitrary and httpOnly
  security cookies are never returned in JSON. CSRF token responses use
  `Cache-Control: no-store`.
- Cookie/session-derived GET responses use `Cache-Control: private, no-store`,
  including the credentialed CORS resource, so shared caches cannot replay one
  browser's state to another.

## Rate Limiting / 请求限流

Use `CommonRateLimitModule` from `src/platform/security/rate-limit/` for request budget
protection. It registers `@nestjs/throttler` as a global guard and reads named
throttler definitions from `config/config.yaml`.

请求预算保护使用 `src/platform/security/rate-limit/` 中的 `CommonRateLimitModule`。它将
`@nestjs/throttler` 注册为全局 guard，并从 `config/config.yaml` 读取命名限流策略。

Default template policy / 模板默认策略：

```yaml
rateLimit:
  enabled: true
  trustProxy: loopback
  errorMessage: Too many requests
  throttlers:
    - name: short
      ttl: 1000
      limit: 3
    - name: medium
      ttl: 10000
      limit: 20
    - name: long
      ttl: 60000
      limit: 100
```

Common scenarios / 常用场景：

- Public APIs: keep the global baseline limit enabled for anonymous traffic.
- Credential entrypoints: use `@Throttle()` on login, registration, password
  reset, OTP, invite, and token issuance endpoints. The demo login overrides
  the named `short` budget; startup validation therefore requires exactly one
  `short` throttler.
- Webhooks and callbacks: use endpoint-specific budgets based on provider
  retry behavior.
- Health checks: use `@SkipHttpThrottle()` for trusted infrastructure probes.
  It skips every configured HTTP throttler without naming them.
- Reverse proxies: keep `rateLimit.trustProxy` aligned with your ingress
  topology so throttling tracks the original client IP instead of the proxy.

Demo endpoints / 示例接口：

- `GET /demo-rate-limit/default`: global throttler behavior.
- `POST /demo-rate-limit/login`: stricter route-level override.
- `GET /demo-rate-limit/health`: explicit `@SkipHttpThrottle()` bypass.

The built-in throttler storage is in memory. For multiple production instances,
use a Redis-compatible throttler storage so all instances share the same request
budget state.

内置限流存储是进程内内存。生产多实例部署时，应接入 Redis 兼容存储，让所有实例共享
同一份请求预算状态。
