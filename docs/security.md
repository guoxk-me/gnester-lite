# Security Utilities / 安全工具

> CN: 文档文件，说明 security 的用途；EN: Documentation file explains the purpose of security.

This template keeps cryptographic primitives in `src/common/crypto/` and application examples in `src/features/demo-crypto/`.

本模板将通用加密能力放在 `src/common/crypto/`，将应用示例放在 `src/features/demo-crypto/`。

## Password Hashing / 密码哈希

Use `PasswordHashService` from `src/common/auth/password-hash.service.ts` for passwords.

密码使用 `src/common/auth/password-hash.service.ts` 中的 `PasswordHashService`。

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

Use `CsrfService` from `src/common/csrf/csrf.service.ts` for browser clients
that authenticate through cookies or sessions.

浏览器客户端通过 cookie 或 session 自动携带凭证时，使用
`src/common/csrf/csrf.service.ts` 中的 `CsrfService`。

- Implementation: `csrf-csrf`, registered globally in `src/main.ts`.
- Token endpoint demo: `GET /demo-csrf/token`.
- Unsafe methods (`POST`, `PUT`, `PATCH`, `DELETE`) must send the token in
  `x-csrf-token`.
- Missing or invalid tokens return `{ statusCode: 403, code:
  "CSRF_TOKEN_INVALID", message: "Invalid CSRF token" }`.
- Set `CSRF_SECRET` in production when `CSRF_ENABLED=true`.

Typical flow / 典型流程：

```http
GET /demo-csrf/token
```

```json
{
  "csrfToken": "<token>",
  "headerName": "x-csrf-token"
}
```

Then / 然后：

```http
POST /demo-csrf/transfer-preview
x-csrf-token: <token>
Content-Type: application/json

{
  "recipient": "alice@example.com",
  "amount": 25
}
```

Use CSRF protection for cookie-backed browser sessions, admin panels, and SPAs
that rely on browser-attached credentials. It is usually unnecessary for pure
`Authorization: Bearer <token>` APIs where the browser does not attach the
credential automatically.

Cookie/session 浏览器应用、后台管理页面、依赖浏览器自动携带凭证的 SPA 需要
CSRF 防护。纯 `Authorization: Bearer <token>` API 通常不需要 CSRF，因为浏览器
不会自动附加该 header。

## Auth Guards / 鉴权守卫

This template currently ships **two** JWT HTTP guard styles:

本模板目前并存 **两套** JWT HTTP 守卫：

| Guard | Style | Used by |
|---|---|---|
| `JwtAuthGuard` + `JwtStrategy` | Passport (`@nestjs/passport`) | `demo-auth` (`GET /demo-auth/profile`) |
| `AuthGuard` (hand-rolled) | Direct `JwtService.verifyAsync` + `@Public()` | `demo-authorization` protected routes |

- Login uses `LocalAuthGuard` + `LocalStrategy` in `demo-auth`.
  登录在 `demo-auth` 使用 `LocalAuthGuard` + `LocalStrategy`。
- Prefer Passport guards for new endpoints so strategies stay centralized.
  新接口优先用 Passport 守卫，策略集中在一处。
- Converging `demo-authorization` onto `JwtAuthGuard` is an intentional auth
  contract change and should be done deliberately (not as a drive-by refactor).
  将 `demo-authorization` 收敛到 `JwtAuthGuard` 属于鉴权契约变更，应显式决策后再做。

## Rate Limiting / 请求限流

Use `CommonRateLimitModule` from `src/common/rate-limit/` for request budget
protection. It registers `@nestjs/throttler` as a global guard and reads named
throttler definitions from `config/config.yaml`.

请求预算保护使用 `src/common/rate-limit/` 中的 `CommonRateLimitModule`。它将
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
  reset, OTP, invite, and token issuance endpoints.
- Webhooks and callbacks: use endpoint-specific budgets based on provider
  retry behavior.
- Health checks: use `@SkipThrottle({ short: true, medium: true, long: true })`
  for readiness/liveness probes that come from trusted infrastructure. Named
  throttlers must be skipped by name.
- Reverse proxies: keep `rateLimit.trustProxy` aligned with your ingress
  topology so throttling tracks the original client IP instead of the proxy.

Demo endpoints / 示例接口：

- `GET /demo-rate-limit/default`: global throttler behavior.
- `POST /demo-rate-limit/login`: stricter route-level override.
- `GET /demo-rate-limit/health`: explicit `@SkipThrottle()` bypass.

The built-in throttler storage is in memory. For multiple production instances,
use a Redis-compatible throttler storage so all instances share the same request
budget state.

内置限流存储是进程内内存。生产多实例部署时，应接入 Redis 兼容存储，让所有实例共享
同一份请求预算状态。
