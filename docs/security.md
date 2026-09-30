# Security / 安全

机制归 `src/infra/auth`、`authorization`、`crypto`、`csrf`、`rate-limit`；账号、登录会话、管理员规则和邀请归 `src/modules/identity`。

## Application sessions / 应用会话

当前浏览器入口为 `GET /api/session` 和 `POST /api/session/login`、`refresh`、`logout`。公开注册关闭，管理员创建账号或发一次性邀请。

- `gvueter_access` 为 HttpOnly、SameSite=Lax 的 HS256 JWT cookie，路径 `/api`，15 分钟有效。
- `gvueter_refresh` 为 HttpOnly、SameSite=Lax 的随机 token cookie，路径 `/api/session`。数据库只存 SHA-256 digest；refresh 在行锁内轮换并检查当前账号。
- 不记住登录时，会话有效 24 小时，refresh cookie 为浏览器 session cookie；记住登录时有效七天，刷新延长七天。浏览器恢复会影响 session cookie 的实际消失时间。
- 生产 cookie 强制 Secure。每次受保护请求验证 JWT、数据库中仍存活的会话和账号状态。登出、停用账号撤销服务端会话。
- `SessionAuthGuard` 写入受检的 `SessionUser`，`CurrentSessionUser` 提供给 controller，服务接收 userId。`IdentityAdminGuard` 再检查当前管理员权限；助手不调用身份模块的私有实现。
- 响应只包含公开用户字段，token 不进入 JSON。会话响应使用 `Cache-Control: private, no-store`。

首次管理员通过 `pnpm admin:bootstrap` 受控创建。命令不读 dotenv，也不支持 `--help`：进程环境须包含 `GNESTER_ALLOW_ADMIN_BOOTSTRAP=true`、显式数据库连接以及 `ADMIN_EMAIL`、`ADMIN_NAME`、`ADMIN_PASSWORD`。启动服务不会自动提权。生产需独立配置 JWT/CSRF/encryption/HMAC 密钥并执行受控迁移。

通用 `AuthModule` 保留密码哈希、JWT 信任政策和 Bearer Guard，`AuthorizationModule` 保留角色、权限和策略 Guard。它们不决定当前应用的账号或 session 业务规则。当前浏览器入口使用应用 cookie 会话。

## Password Hashing / 密码哈希

Use `PasswordHashService` from `src/infra/auth/password-hash.service.ts` for passwords.

密码使用 `src/infra/auth/password-hash.service.ts` 中的 `PasswordHashService`。

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

## CSRF / 浏览器写入

`CsrfService` 使用 `csrf-csrf`，由 bootstrap 在请求进入 Nest controller 前注册。所有 unsafe methods（POST、PUT、PATCH、DELETE），包括登录、刷新、登出和邀请接受，需发送固定 `X-XSRF-TOKEN` header。

`GET /api/session` 即使返回 401 也设置可读的 `XSRF-TOKEN` cookie；Axios 同源写入自动携带匹配 header。独立 identifier cookie 保持 HttpOnly，不依赖已移除的 express-session。命令行客户端可先请求 `GET /api/security/csrf-token`，保留返回 cookie，再发送 `data.csrfToken`。

CSRF 错误返回本地化 envelope，HTTP code 为 403。生产必须启用 CSRF 并配置独立 `CSRF_SECRET`、HTTPS 与同源 `/api` 代理；SameSite=None 必须配合 Secure。修改前端或外部客户端时保持固定 Axios cookie/header 契约。

## Personal provider keys / 个人供应商 Key

`assistant` 按账号检查 Key 所有权，以 AES-256-GCM 存储可恢复密钥并绑定账号、供应商和 Key ID 的 authenticated context。原始 Key 不进入浏览器响应、队列载荷或日志。供应商错误分类与调用协议由 provider 服务处理，个人 Key 的选择、失效和删除由配置服务处理。

## Invitations / 邀请

邀请 token 只展示一次，数据库保存 digest。预览和接受通过 POST body 传 token，避免进入服务端请求 URL 和 access log。已有管理员规则、账号禁用、最后管理员保护和邀请事务保留原有语义。

## Rate limits / 限流

`src/infra/rate-limit` 注册全局 Throttler Guard，策略来自 YAML。登录和敏感 Key 操作声明更严格的 `@Throttle()`；校验要求恰好一个名为 `short` 的策略。健康探针使用 `common/http/skip-http-throttle.decorator.ts` 跳过全部 HTTP 策略。

`rateLimit.trustProxy` 必须匹配代理拓扑，才能追踪原始客户端 IP。当前存储为进程内内存，多实例部署需要共享存储才能实现跨实例预算。

## Verification / 验证

```bash
pnpm run test -- src/infra/auth src/infra/authorization src/infra/crypto src/infra/csrf src/modules/identity
pnpm run test:e2e
pnpm run verify:openapi
```
