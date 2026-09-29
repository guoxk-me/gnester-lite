# gnester-lite 一次性完整只读审计报告

> 依据：`prompts/full-project-audit.md`  
> 审计对象：当前工作区最终状态（不比较 `HEAD`，不修复代码）  
> 报告生成时间：`2026-07-23T18:52:13+08:00`  
> 补录时间：`2026-07-23T18:55:00+08:00`（六分区子代理回报交叉复核后增补）

---

## 1. 审计元数据、范围与限制

| 项              | 值                                                      |
| --------------- | ------------------------------------------------------- |
| 日期            | 2026-07-23                                              |
| 分支            | `refactor/application-structure`                        |
| Node            | `v24.18.0`（Executed）                                  |
| pnpm            | `11.1.2`（Executed）                                    |
| 基线            | 当前工作区文件内容                                      |
| 模式            | 只读全量审计；禁止修复 / commit / 启动服务              |
| 并行方式        | 主控取证 + 六个只读分区并行探索；最终判定由主控交叉复核 |
| 既有 dirty tree | 开始时约 62 条 `git status` 条目；**不作为质量缺陷**    |

已读取/盘点范围（Inspected）：

- `src/common/`、`src/features/`、`src/bootstrap/`、`src/migrations/`
- `config/`、`test/`、`docs/`（含专题文档）、`prompts/`
- `Dockerfile`、`docker-compose.yml`、CI/脚本相关 `package.json`
- 动态验证产物：`dist/`、`coverage/`、`documentation/`（gitignore 忽略）

明确排除：

- 未比较相对 `HEAD` 的 diff 归因
- 未把 `.cursor/self-audit-state.md` / `prompts/self-audit-loop.md` 历史分数当证据
- 未启动 MySQL / Redis / Compose / 长期应用进程
- 未输出真实密钥或 `.env` 内容

外部环境限制：

- 本机无 `docker` CLI → `docker compose config` **Blocked**
- MySQL/Redis 未在审计中启动 → 完整运行时装配、真实 DB/Redis 集成路径 **未验证**

文件安全声明：除本报告与被忽略验证产物外，不应修改项目源码/配置/既有文档。

---

## 2. 执行摘要

**一句话结论：**  
模板在本地静态验证（lint / unit / build / e2e / coverage / prettier / compodoc）表现扎实，但存在 **4 项 High**（JWT 双轨校验分裂、请求日志敏感头泄露、生产依赖漏洞、Docker/迁移路径断裂），因此**尚不足以作为“开箱即生产可部署”模板**；更适合作为学习与二次裁剪基线。

| 指标                      | 结果                               |
| ------------------------- | ---------------------------------- |
| Overall readiness（保守） | **2 / 5**（存在 High，按规则封顶） |
| 15 维算术平均             | **2.6 / 5**                        |
| Blocker（确认缺陷）       | **0**                              |
| High                      | **4**                              |
| Medium                    | **15**                             |
| Low                       | **8**                              |
| Info                      | **4**                              |
| Accepted Design           | **6**                              |
| Environment Blockers      | **2**                              |
| Needs Verification        | **4**                              |

前 5 个最高风险：

1. **GNL-AUD-001** 手写 `AuthGuard` 不校验 JWT `issuer`/`audience`，与 Passport `JwtStrategy` 语义分裂
2. **GNL-AUD-002** nestjs-pino 未配置 `redact`，默认序列化会保留 `Authorization`/`Cookie`
3. **GNL-AUD-004** 运行时 migration glob 指向 `dist/migrations/*.js`，SWC 实际输出 `dist/src/migrations/`；Docker CMD 不跑迁移且 `DB_SYNCHRONIZE=false`
4. **GNL-AUD-003** `pnpm audit --prod` 报 56 个漏洞（含 critical/high），直接依赖 `axios@1.16.1` 等可升级面明确
5. **GNL-AUD-006 / 007** e2e 装配过浅 + 根路由 versioning 契约漂移，掩盖生产中间件/版本行为

三态证据判断：

| 目标       | 结论                                                                     |
| ---------- | ------------------------------------------------------------------------ |
| 模板可学习 | **基本具备**（文档面广、Demo 多、静态测试绿）                            |
| 本地可验证 | **部分具备**（单元/e2e 绿，但缺 MySQL/Redis 真实集成；Quick Start 过简） |
| 生产可部署 | **证据不足且存在 High**（迁移路径、依赖审计、日志脱敏、鉴权一致性）      |

关键盲区：完整 `AppModule` + configureApplication + MySQL + Redis 的真实启动与冒烟；容器内迁移执行；Compose 配置校验；生产流量下日志/Sentry PII 采样。

---

## 3. 环境与验证命令矩阵

| 命令                                         |    状态 | 退出码 | 耗时（约） | 失败类型    | 证据摘要                                                                                  |
| -------------------------------------------- | ------: | -----: | ---------: | ----------- | ----------------------------------------------------------------------------------------- |
| `node --version`                             |    Pass |      0 |        <1s | —           | v24.18.0                                                                                  |
| `pnpm --version`                             |    Pass |      0 |        <1s | —           | 11.1.2                                                                                    |
| `pnpm run lint:check`                        |    Pass |      0 |    ~数十秒 | —           | ESLint 无错误                                                                             |
| `pnpm exec prettier --check src test config` |    Pass |      0 |      ~数秒 | —           | 格式一致                                                                                  |
| `pnpm run test`                              |    Pass |      0 |    ~数十秒 | —           | **84** suites / **349** tests                                                             |
| `pnpm run test:cov`                          |    Pass |      0 |    ~1–2min | —           | Statements ~**83.43%** / Branches ~**44.82%** / Functions ~**92.75%** / Lines ~**85.79%** |
| `pnpm run build`                             |    Pass |      0 |    ~数十秒 | —           | TSC 0 issues；SWC 322 files；`dist/src/migrations` 存在，`dist/migrations` **不存在**     |
| `pnpm run test:e2e`                          |    Pass |      0 |    ~数十秒 | —           | **4** suites / **10** tests                                                               |
| `pnpm run compodoc`                          |    Pass |      0 |    ~数十秒 | —           | 生成 `documentation/`                                                                     |
| `pnpm audit --prod`                          |    Fail |   非 0 |      ~数秒 | 项目/供应链 | **56** vulns：2 critical / 27 high / 24 moderate / 3 low                                  |
| `docker compose config`                      | Blocked |      — |          — | 环境        | 本机无 `docker` 命令                                                                      |
| 启动 MySQL/Redis/应用                        | Skipped |      — |          — | 边界        | 审计边界禁止启动长期服务                                                                  |

补充 Executed 探针：

- `JwtService.verifyAsync(token)` **不带** `issuer`/`audience` 选项时，接受 `iss=evil`/`aud=other` 的 token（与 `AuthGuard` 行为一致）
- `pino.stdSerializers.req` 保留 `headers.authorization` 与 `headers.cookie`
- 解析依赖：`axios` 实际为 `1.16.1`

---

## 4. 十五维度评分卡

| 维度                    | 分数 | 最高严重度 | 证据摘要                                                     | 主要扣分原因         |
| ----------------------- | ---: | ---------- | ------------------------------------------------------------ | -------------------- |
| D1 模板能力完成度       |    3 | Medium     | 23 demo + common 平台齐全；Quick Start/迁移交付缺口          | GNL-AUD-005/004      |
| D2 功能正确性与错误处理 |    3 | Medium     | 单元大量边界覆盖；根路由/分片上传/WS 房间有缺口              | GNL-AUD-007/009/008  |
| D3 认证与授权           |    2 | High       | Passport 路径有 iss/aud；手写路径无                          | GNL-AUD-001          |
| D4 HTTP 与会话安全      |    3 | Medium     | CSRF e2e + 生产 MemoryStore throw；日志可带 Cookie           | GNL-AUD-002 交叉影响 |
| D5 输入/网络/文件/秘密  |    2 | High       | ValidationPipe 严格；日志脱敏缺失 + 依赖漏洞                 | GNL-AUD-002/003/009  |
| D6 架构与依赖边界       |    4 | Low        | features→common 清晰；DemosModule 聚合合理                   | 双轨 Auth 易误用     |
| D7 类型/清晰度/可维护性 |    3 | Medium     | `strictNullChecks` 开；`noImplicitAny:false`；ESLint any off | GNL-AUD-012          |
| D8 配置正确性           |    3 | Medium     | YAML+env 双校验扎实；configuration 文档不全                  | GNL-AUD-011          |
| D9 数据库与迁移         |    2 | High       | 生产禁 synchronize；runtime migration glob 错误              | GNL-AUD-004          |
| D10 异步与集成可靠性    |    3 | Medium     | queue/schedule 有开关与测试；Redis readiness 缺失            | GNL-AUD-010/009/008  |
| D11 可观测性            |    2 | High       | Pino/Sentry 已接入；缺 redact                                | GNL-AUD-002          |
| D12 文档与契约          |    3 | Medium     | 专题文档丰富；Quick Start/env 列表/versioning 偏差           | GNL-AUD-005/011/007  |
| D13 测试与验证质量      |    3 | Medium     | 349 unit + 10 e2e 绿；缺完整装配与若干关键 spec              | GNL-AUD-006/013      |
| D14 部署与 DX           |    2 | High       | 多阶段 Dockerfile；无迁移入口、无非 root USER                | GNL-AUD-004 + Low    |
| D15 安全与供应链        |    2 | High       | 生产约束多处到位；audit 失败 + 鉴权分裂                      | GNL-AUD-001/002/003  |

算术平均：**2.7**；保守 Overall readiness：**2/5**。

---

## 5. 全量能力矩阵

图例：Complete / Partial / Missing / Not Applicable

| 能力                            | common/bootstrap                                     | demo/consumer        | module wiring        | config             | unit tests                            | e2e               | docs                         | runtime dependency | 状态     | 证据                             |
| ------------------------------- | ---------------------------------------------------- | -------------------- | -------------------- | ------------------ | ------------------------------------- | ----------------- | ---------------------------- | ------------------ | -------- | -------------------------------- |
| Bootstrap / 启动管线            | `instrument.ts`→`main.ts`→`configure-application.ts` | —                    | AppModule            | env/YAML           | `configure-application.spec.ts`       | 仅 csrf 调用      | AGENTS/README                | Node               | Complete | Inspected                        |
| Config YAML+env                 | `config/`                                            | demo-config          | ConfigModule.forRoot | 双校验             | `validation.spec.ts` 等               | 间接              | configuration 不全           | —                  | Partial  | GNL-AUD-011                      |
| ValidationPipe                  | bootstrap                                            | demo-validation      | 全局 pipe            | —                  | 多处 DTO/controller                   | 部分              | docs/validation.md           | —                  | Complete | Inspected                        |
| Logger (Pino)                   | `CommonLoggerModule`                                 | 全局                 | AppModule            | LOGGER\_\*         | logger specs                          | —                 | docs/logger.md               | —                  | Partial  | GNL-AUD-002                      |
| Sentry                          | `instrument.ts` + sentry module                      | demo-sentry          | 条件初始化           | SENTRY\_\*         | demo-sentry specs                     | —                 | docs/project-notes           | 外网               | Complete | Inspected                        |
| Health                          | health controller                                    | —                    | AppModule            | —                  | health specs                          | —                 | README                       | MySQL              | Partial  | GNL-AUD-010                      |
| Security/Helmet/CORS            | bootstrap                                            | demo-cors/security   | configureApplication | CORS\_\* 等        | bootstrap/csrf e2e                    | csrf              | docs/security.md             | —                  | Complete | Inspected                        |
| CSRF                            | csrf module + bootstrap                              | demo-csrf            | 中间件链             | CSRF_SECRET        | csrf e2e                              | csrf e2e          | security.md                  | session/cookie     | Complete | Executed e2e                     |
| Session/Cookie                  | bootstrap session                                    | demo-session/cookies | MemoryStore          | SESSION\_\*        | bootstrap/session specs               | —                 | docs                         | —                  | Partial  | 生产禁用 MemoryStore（Accepted） |
| Auth Local/JWT (Passport)       | strategies/guards                                    | demo-auth            | DemoAuthModule       | JWT\_\*            | strategy/controller specs             | app e2e 切片      | docs                         | —                  | Complete | Inspected                        |
| Auth 手写 Guard                 | `auth.guard.ts`                                      | demo-authorization   | CommonAuthModule     | JWT\_\*            | auth.guard.spec（未测 iss/aud）       | —                 | —                            | —                  | Partial  | GNL-AUD-001                      |
| Authorization roles/perm/policy | guards in common/auth                                | demo-authorization   | feature import       | —                  | controller specs                      | —                 | docs                         | —                  | Complete | Inspected                        |
| Crypto                          | crypto module                                        | demo-crypto          | 按需                 | ENCRYPTION/HMAC    | specs                                 | —                 | docs                         | —                  | Complete | Inspected                        |
| Database/TypeORM                | database config                                      | demo-database        | AppModule TypeORM    | DB\_\*             | demo-database specs                   | **无真实 DB e2e** | docs/database.md             | MySQL              | Partial  | GNL-AUD-004                      |
| Migrations                      | `src/migrations`                                     | CLI scripts          | runtime glob         | —                  | config specs 断言错误路径             | —                 | README                       | MySQL              | Partial  | GNL-AUD-004                      |
| Cache/Redis                     | CommonCacheModule                                    | demo-cache           | @Global              | cache YAML + REDIS | specs                                 | 无                | docs/cache.md                | Redis              | Partial  | GNL-AUD-010                      |
| Queue/BullMQ                    | CommonQueueModule                                    | demo-queue           | Demos 测试排除       | queue YAML         | processor specs                       | 无                | docs/queue.md                | Redis              | Partial  | 测试隔离 Accepted                |
| Schedule                        | CommonScheduleModule                                 | demo-schedule        | 开关                 | schedule YAML      | specs                                 | 无                | docs/schedule.md             | —                  | Complete | Inspected                        |
| Events                          | EventEmitter                                         | demo-events          | feature              | —                  | controller 间接；listener 无独立 spec | 无                | docs                         | —                  | Partial  | GNL-AUD-013                      |
| HTTP Client                     | http-client module                                   | demo-http            | @Global              | http-client YAML   | config/module specs                   | 无                | docs                         | 外网               | Complete | Inspected                        |
| Rate Limit                      | throttler module                                     | demo-rate-limit      | AppModule            | YAML               | specs                                 | 无                | docs                         | —                  | Complete | Inspected                        |
| Upload                          | —                                                    | demo-upload          | DemosModule          | multer             | controller 为主；service 无独立 spec  | 无                | docs                         | FS                 | Partial  | GNL-AUD-009/013                  |
| Streaming files                 | —                                                    | demo-streaming-files | DemosModule          | —                  | specs                                 | 无                | docs                         | FS                 | Complete | Inspected                        |
| SSE                             | —                                                    | demo-sse             | DemosModule          | —                  | specs                                 | 无                | docs                         | —                  | Complete | Inspected                        |
| WebSocket                       | WS adapter bootstrap                                 | demo-websocket       | DemosModule          | —                  | gateway/filter specs                  | 无                | docs/websocket.md + AsyncAPI | —                  | Partial  | GNL-AUD-008                      |
| Serialization                   | —                                                    | demo-serialization   | DemosModule          | —                  | specs                                 | 无                | docs/serialization.md        | —                  | Complete | Inspected                        |
| OpenAPI                         | bootstrap setup                                      | 各 controller        | 非生产               | —                  | —                                     | —                 | docs/openapi.md              | —                  | Complete | Inspected                        |
| AsyncAPI                        | bootstrap                                            | websocket            | 非生产               | —                  | —                                     | —                 | docs/asyncapi.md             | —                  | Complete | 供应链经由 generator（AUD-003）  |
| Docker/Compose                  | Dockerfile/compose                                   | —                    | —                    | 示例 env           | —                                     | —                 | README                       | Docker             | Partial  | GNL-AUD-004；compose Blocked     |
| Compodoc                        | script                                               | —                    | —                    | —                  | —                                     | —                 | README                       | —                  | Complete | Executed                         |

盘点规模（Inspected）：`src` 模块约 36；features 模块 23；unit specs（src+config）约 84 suites；e2e 4。

---

## 6. 详细 Findings

### 6.1 Blocker

无。

### 6.2 High

#### GNL-AUD-001

- **标题:** 手写 `AuthGuard` 未校验 JWT issuer/audience，与 Passport 路径语义分裂
- **类型:** Bug / 安全
- **维度:** D3 / D15
- **严重度:** High
- **置信度:** High
- **证据类型:** Inspected + Executed
- **位置:**
  - `src/common/auth/auth.guard.ts`（`verifyAsync(token)` 无 options）
  - `src/common/auth/strategies/jwt.strategy.ts`（`issuer`/`audience` 已配置）
  - `src/examples/demo-authorization/demo-authorization.controller.ts`（`@UseGuards(AuthGuard, …)`）
  - `src/examples/demo-websocket/demo-websocket.service.ts`（`verifyAsync(token)` 同样无 iss/aud）
  - `src/common/auth/auth.guard.spec.ts`（仅断言 `verifyAsync('token_123')`）
- **现象:** 错误 `iss`/`aud` 的 token 仍可被手写 Guard / WebSocket 握手接受；Passport `JwtAuthGuard` 路径会拒绝。
- **预期或判定依据:** 同一模板内 JWT 校验语义应一致；`JWT_ISSUER`/`JWT_AUDIENCE` 既已配置就应强制。
- **影响:** 学习/复制 `demo-authorization` 模式会把弱校验带进业务；跨服务 token 混淆风险上升。
- **根因:** `JwtService.verifyAsync` 默认不应用 `signOptions` 中的 issuer/audience。
- **复现/验证方法:** 用错误 iss/aud 签发后调用 `verifyAsync` 无 options（本次已 Executed 复现）。
- **最小修复建议:** `verifyAsync(token, { issuer, audience })` 从 ConfigService 读取；统一推荐 Passport 或删除双轨并文档化。
- **建议补充测试:** 错误 iss/aud 必须 401；与 JwtStrategy 行为对齐的契约测试。
- **相关 finding:** GNL-AUD-013

#### GNL-AUD-002

- **标题:** 请求日志可能泄露 Authorization / Cookie
- **类型:** 安全 / 可观测性
- **维度:** D5 / D11 / D4
- **严重度:** High
- **置信度:** High
- **证据类型:** Inspected + Executed
- **位置:** `src/common/logger/logger.config.ts` `createPinoLoggerParams`（无 `redact`）；`docs/logger.md` 无敏感字段说明
- **现象:** nestjs-pino 使用 pino 默认 `req` 序列化；Executed 显示 `authorization`/`cookie` 会被保留。
- **预期或判定依据:** 生产导向模板应对 Bearer/Cookie 默认脱敏。
- **影响:** 日志系统、集中采集、支持导出可能长期留存会话与令牌。
- **根因:** 未配置 `redact.paths` / 自定义 req serializer。
- **复现/验证方法:** `pino.stdSerializers.req` 对含 Authorization 的伪请求序列化。
- **最小修复建议:** 增加 `redact: ['req.headers.authorization','req.headers.cookie',…]`，并更新 logger 文档。
- **建议补充测试:** logger config 断言 redact 路径存在。
- **相关 finding:** —

#### GNL-AUD-003

- **标题:** 生产依赖审计失败（含可升级直接依赖）
- **类型:** 供应链安全
- **维度:** D15 / D14
- **严重度:** High
- **置信度:** High（漏洞库命中 Executed；业务可达性部分 Assumed）
- **证据类型:** Executed + Inspected
- **位置:** `pnpm audit --prod`；`package.json` `axios@^1.16.1`（解析为 1.16.1）；间接链含 multer/ws/js-yaml/typeorm/lodash 等；AsyncAPI generator 链含 jsonpath-plus/tar critical
- **现象:** 56 漏洞：2 critical / 27 high / 24 moderate / 3 low。
- **预期或判定依据:** 生产模板应对已知高危直接依赖给出升级路径或风险说明。
- **影响:** 运行时 HTTP 客户端、上传、WS、YAML、ORM 路径可能受影响；文档生成链 critical 需按可达性降权但仍应披露。
- **根因:** 锁文件/声明版本落后；传递依赖未 overrides。
- **复现/验证方法:** `pnpm audit --prod`。
- **最小修复建议:** 优先升级 `axios` 等直接依赖；评估 overrides；将 AsyncAPI 生成工具移出生产依赖或隔离。
- **建议补充测试:** CI 增加 audit 门禁（允许名单需显式）。
- **相关 finding:** —

#### GNL-AUD-004

- **标题:** Docker/生产迁移路径断裂
- **类型:** Bug / 部署
- **维度:** D9 / D14 / D1
- **严重度:** High
- **置信度:** High
- **证据类型:** Inspected + Executed（build 产物路径）
- **位置:**
  - `config/database.config.ts` `RUNTIME_MIGRATION_GLOBS = ['dist/migrations/*.js']`
  - 构建后实际：`dist/src/migrations/*.js`；`dist/migrations` 不存在
  - `Dockerfile` `CMD ["node","dist/src/main.js"]`（无 migration）
  - `docker-compose.yml` `DB_SYNCHRONIZE: false`
- **现象:** 容器新库在 synchronize=false 时可能无表；即便手动跑 runtime migrations，glob 也匹配不到文件。
- **预期或判定依据:** README 要求生产用 migrations；部署路径应可执行。
- **影响:** Compose/镜像“看起来能起”但业务表缺失；运维误判为应用 bug。
- **根因:** SWC `stripLeadingPaths:false` 使 migrations 落在 `dist/src/migrations`；Docker 未编排迁移步骤。
- **复现/验证方法:** `pnpm run build` 后检查目录；阅读 Dockerfile/compose。
- **最小修复建议:** 修正 glob 为 `dist/src/migrations/*.js`；Docker entrypoint 增加 `migration:run` 或 init job；文档写明。
- **建议补充测试:** database.config 契约测试断言与真实 dist 布局一致；可选 smoke。
- **相关 finding:** GNL-AUD-005

### 6.3 Medium

#### GNL-AUD-005

- **标题:** README Quick Start 不足以完成首次可运行启动
- **类型:** 文档 / DX
- **维度:** D12 / D14 / D1
- **严重度:** Medium
- **置信度:** High
- **证据类型:** Inspected
- **位置:** `README.md` Quick Start（仅 `pnpm install` + `start:dev`）；仓库无 shipped `.env.example`（`.env*` 被 ignore）
- **现象:** 未明确 MySQL/Redis、必要 env、migration 顺序；新手按文档启动易失败。
- **预期:** Requirements 已列 MySQL/Redis，Quick Start 应给出最小可运行步骤或指向 Compose。
- **影响:** “本地可验证”体验下降，误判模板不可用。
- **根因:** 文档假设读者已有外部依赖与私有 env。
- **复现:** 全新 clone 仅按 Quick Start 执行（逻辑推演；未真起服务）。
- **最小修复建议:** Quick Start 改为 `docker compose` 或补充 env/migration 清单；提供脱敏 `.env.example`。
- **建议补充测试:** 文档契约/模板检查（可选）。
- **相关 finding:** GNL-AUD-004

#### GNL-AUD-006

- **标题:** E2E 装配过浅，未覆盖完整 bootstrap + AppModule
- **类型:** 测试缺口
- **维度:** D13 / D2
- **严重度:** Medium
- **置信度:** High
- **证据类型:** Inspected + Executed（e2e 通过但覆盖面有限）
- **位置:** `test/*.e2e-spec.ts`（4 套）；多数切片模块；仅 csrf 调用 `configureApplication`
- **现象:** versioning、Helmet、全局 ValidationPipe、完整 Demo 装配、DB/Redis 集成未被 e2e 守住。
- **影响:** 生产中间件顺序/版本路由回归可静默通过 CI。
- **根因:** 有意用轻量 TestingModule，但缺少至少一条“接近生产装配”的冒烟。
- **最小修复建议:** 增加一条带 `configureApplication` 的核心路由冒烟；DB/Redis 用 CI service 可选 job。
- **建议补充测试:** `/health/live` + 一根 VERSION_NEUTRAL demo + 根路由版本行为。
- **相关 finding:** GNL-AUD-007

#### GNL-AUD-007

- **标题:** 根路由 versioning 契约漂移
- **类型:** 契约 / 正确性
- **维度:** D2 / D12 / D13
- **严重度:** Medium
- **置信度:** High
- **证据类型:** Inspected
- **位置:** `src/app.controller.ts`（无 `VERSION_NEUTRAL`）；`configure-application.ts` `enableVersioning`；`test/app.e2e-spec.ts` 测 `GET /` 且未启用 versioning
- **现象:** 生产启用 URI versioning 后根路由更可能是 `/v1/`；e2e 的 `/` 不能代表生产。
- **影响:** 监控/网关/文档若写 `/` 会 404。
- **最小修复建议:** 根控制器显式 `VERSION_NEUTRAL` 或文档/e2e 统一为 `/v1`。
- **建议补充测试:** 带 versioning 的 e2e。
- **相关 finding:** GNL-AUD-006

#### GNL-AUD-008

- **标题:** WebSocket 房间广播缺少成员资格校验
- **类型:** 授权/可靠性（Demo 教学模式）
- **维度:** D3 / D10
- **严重度:** Medium
- **置信度:** Medium-High
- **证据类型:** Inspected
- **位置:** `src/examples/demo-websocket/demo-websocket.gateway.ts`（`server.to(dto.room).emit`）；文档示例同类
- **现象:** 已认证 socket 可向任意 room 广播，无需先 join/成员校验。
- **影响:** 若被直接复制到生产，构成横向越权/骚扰面。
- **判定说明:** 可作为“刻意简化 Demo”，但模板必须醒目标记生产注意事项；当前更像缺口而非 Accepted。
- **最小修复建议:** 校验 `client.rooms` 或服务端维护成员表；文档加粗警告。
- **建议补充测试:** 未加入房间广播应失败。
- **相关 finding:** —

#### GNL-AUD-009

- **标题:** 分片上传会话无 TTL/清理
- **类型:** 可靠性
- **维度:** D2 / D5 / D10
- **严重度:** Medium
- **置信度:** High
- **证据类型:** Inspected
- **位置:** `src/examples/demo-upload/demo-upload.service.ts` `chunkedUploadSessions = new Map`；配套 temp 存储
- **现象:** 中断上传的会话与临时文件可在进程内存/磁盘滞留；无过期扫描。
- **影响:** 长时间运行 Demo/误用可导致内存与磁盘增长。
- **最小修复建议:** 会话 TTL + 定期清理；进程退出钩子。
- **建议补充测试:** 过期会话不可 complete。
- **相关 finding:** GNL-AUD-013

#### GNL-AUD-010

- **标题:** Readiness 未覆盖 Redis，与硬依赖语义不符
- **类型:** 运维语义
- **维度:** D10 / D11 / D1
- **严重度:** Medium
- **置信度:** High
- **证据类型:** Inspected
- **位置:** `src/common/health/health.controller.ts` readiness 仅 `TypeOrmHealthIndicator.pingCheck`；cache/queue 依赖 Redis
- **现象:** MySQL 正常但 Redis 宕机时仍可能 ready=200，流量进入后 cache/queue 失败。
- **最小修复建议:** 增加 Redis ping；或文档明确 ready≠Redis。
- **建议补充测试:** Redis down 时 ready 失败（集成）。
- **相关 finding:** —

#### GNL-AUD-011

- **标题:** `docs/configuration.md` Env 列表落后于 `validation.ts`
- **类型:** 文档偏差
- **维度:** D8 / D12
- **严重度:** Medium
- **置信度:** High
- **证据类型:** Inspected
- **位置:** `docs/configuration.md`；`config/validation.ts`（含 CORS*\*、COOKIE_SECRET、COMPRESSION*\_、SESSION\_\_、ENCRYPTION_KEY、HMAC_SECRET 等）
- **现象:** 文档 Env 表未覆盖多项已校验变量。
- **影响:** 配置者漏设关键安全项。
- **最小修复建议:** 以 `EnvironmentVariables` 为单一列表源生成/同步文档。
- **相关 finding:** GNL-AUD-005

#### GNL-AUD-012

- **标题:** “严格 TypeScript”宣称与编译/ESLint 配置不一致
- **类型:** 清晰度 / 可维护性
- **维度:** D7 / D12
- **严重度:** Medium
- **置信度:** High
- **证据类型:** Inspected
- **位置:** `tsconfig.json` `noImplicitAny: false`、`strictBindCallApply: false`；ESLint `@typescript-eslint/no-explicit-any: off`；AGENTS/README 强调严格类型
- **现象:** 实际并非 full `strict`。
- **影响:** 贡献者误判类型安全强度；`any` 可回流。
- **最小修复建议:** 收紧配置或修正文档措辞为“部分严格（strictNullChecks 等）”。
- **相关 finding:** —

#### GNL-AUD-013

- **标题:** 若干关键实现缺少直接行为 spec
- **类型:** 测试缺口
- **维度:** D13
- **严重度:** Medium
- **置信度:** Medium-High
- **证据类型:** Inspected
- **位置（代表性）:**
  - `src/common/auth/guards/jwt-auth.guard.ts` / `local-auth.guard.ts`（无独立 spec）
  - `src/examples/demo-upload/demo-upload.service.ts`（无独立 spec）
  - `src/examples/demo-events/demo-events.listener.ts`、`demo-events-log.service.ts`
  - `auth-token.service` 分支覆盖偏低（coverage ~68%）
- **现象:** 部分行为仅被 controller 间接覆盖；失败路径/iss-aud/TTL 等易漏。
- **最小修复建议:** 为高风险服务/守卫补直接单测。
- **相关 finding:** GNL-AUD-001/009

#### GNL-AUD-021

- **标题:** `/health/*` 未 `@SkipThrottle`，探针可消耗全局限流预算
- **类型:** 可用性 / 运维
- **维度:** D4 / D10 / D14
- **严重度:** Medium
- **置信度:** High
- **证据类型:** Inspected
- **位置:** `src/common/health/health.controller.ts`（无 SkipThrottle）；`src/common/rate-limit/rate-limit.module.ts` 全局 ThrottlerGuard；对比 `demo-rate-limit.controller.ts` 已示范 SkipThrottle
- **现象:** K8s 高频 liveness/readiness 与业务共享 short/medium/long 桶，可能 429 导致误摘流。
- **最小修复建议:** HealthController 加 `@SkipThrottle({ short: true, medium: true, long: true })`。
- **相关 finding:** GNL-AUD-010

#### GNL-AUD-022

- **标题:** 未调用 `app.enableShutdownHooks()`
- **类型:** 可靠性 / 生命周期
- **维度:** D10 / D14
- **严重度:** Medium
- **置信度:** High
- **证据类型:** Inspected
- **位置:** `src/main.ts`（bootstrap 无 enableShutdownHooks）；仅 `CommonScheduleService` 实现 `OnApplicationShutdown`
- **现象:** SIGTERM 时托管 cron/连接/worker 可能无法走完整关停链。
- **最小修复建议:** listen 前 `app.enableShutdownHooks()`；为 BullMQ/TypeORM 补 `onModuleDestroy`。
- **相关 finding:** —

#### GNL-AUD-023

- **标题:** 文档幽灵引用 `FindDemoParamsDto` / `find-demo-params.dto.ts`
- **类型:** 文档偏差
- **维度:** D12
- **严重度:** Medium
- **置信度:** High
- **证据类型:** Inspected
- **位置:** `docs/demo.md`、`docs/validation.md`；实现为 `ParseIntPipe`（Glob 无该 DTO）
- **现象:** 按文档查找 Param DTO 会失败。
- **最小修复建议:** 删除幽灵引用，改为 `ParseIntPipe` 示例。
- **相关 finding:** GNL-AUD-011

#### GNL-AUD-024

- **标题:** 生产环境未强制要求 `DB_*` 连接参数
- **类型:** 配置误配风险
- **维度:** D8 / D9 / D15
- **严重度:** Medium
- **置信度:** High
- **证据类型:** Inspected
- **位置:** `config/validation.ts` 生产条件仅强制 JWT/ENCRYPTION/HMAC/CSRF；`database.config.ts` 默认 `localhost/root/test`
- **现象:** `NODE_ENV=production` 缺 DB 配置时可静默连本地默认库。
- **最小修复建议:** production 校验 `DB_HOST/USERNAME/PASSWORD/DATABASE`。
- **相关 finding:** GNL-AUD-004/005

#### GNL-AUD-025

- **标题:** `CacheService.remember` 无 singleflight，并发 miss 可击穿
- **类型:** 并发 / 性能
- **维度:** D10 / D2
- **严重度:** Medium
- **置信度:** High
- **证据类型:** Inspected
- **位置:** `src/common/cache/cache.service.ts` `remember`（check-then-act）
- **现象:** 并发 miss 时多次执行 `factory()` 并写入。
- **最小修复建议:** 进程内 Promise Map singleflight，或分布式锁。
- **相关 finding:** —

#### GNL-AUD-026

- **标题:** 非 test 环境 `enableOfflineQueue: true`，Redis 故障时命令积压内存
- **类型:** 可靠性
- **维度:** D10 / D14
- **严重度:** Medium
- **置信度:** High
- **证据类型:** Inspected
- **位置:** `src/common/queue/queue.module.ts`
- **现象:** Redis 长时间不可用时 enqueue 命令可在进程内排队，与快速失败/503 语义不一致，存在内存风险。
- **最小修复建议:** 生产默认 `enableOfflineQueue: false`，或设上限并映射 503。
- **相关 finding:** GNL-AUD-010

### 6.4 Low

#### GNL-AUD-014

- **标题:** Dockerfile 未使用非 root `USER`
- **类型:** 容器加固
- **维度:** D14 / D15
- **严重度:** Low
- **置信度:** High
- **证据类型:** Inspected
- **位置:** `Dockerfile` 生产阶段无 `USER`
- **最小修复建议:** 添加非 root 用户与适当文件权限。

#### GNL-AUD-015

- **标题:** 双轨认证 API（Passport vs 手写 Guard）增加误用面
- **类型:** 可维护性
- **维度:** D6 / D3
- **严重度:** Low
- **置信度:** High
- **证据类型:** Inspected
- **位置:** `CommonAuthModule` 同时导出两套 Guard
- **说明:** 本身可教两种模式；但与 GNL-AUD-001 叠加后风险放大。
- **最小修复建议:** 文档明确“推荐路径”，或 demo-authorization 改用 JwtAuthGuard。

#### GNL-AUD-016

- **标题:** 分支覆盖率偏低（~44.8%）
- **类型:** 测试质量信号
- **维度:** D13
- **严重度:** Low
- **置信度:** High
- **证据类型:** Executed
- **位置:** `pnpm run test:cov` 汇总
- **说明:** 总量语句覆盖尚可；分支缺口集中在配置/守卫/边界。

#### GNL-AUD-017

- **标题:** 大量机械中英双语注释噪声
- **类型:** 清晰度
- **维度:** D7
- **严重度:** Low
- **置信度:** Medium
- **证据类型:** Inspected
- **现象:** 多处 “CN:… EN:…” 模板句不解释 why。
- **最小修复建议:** 逐步收敛为有信息量的 why 注释 / AI modified 注释。

#### GNL-AUD-027

- **标题:** Jest 无 `coverageThreshold`，覆盖率下降不阻断 CI
- **类型:** 测试门禁
- **维度:** D13
- **严重度:** Low
- **置信度:** High
- **证据类型:** Inspected
- **位置:** `package.json` jest 段仅有 `collectCoverageFrom`，无阈值
- **最小修复建议:** 增加语句/分支阈值并排除入口文件。

#### GNL-AUD-028

- **标题:** `normalizeWsExceptionError` / `parseFlag` / `parseUuid` 触碰 AGENTS 命名禁令
- **类型:** 命名规范
- **维度:** D7
- **严重度:** Low
- **置信度:** High
- **证据类型:** Inspected
- **位置:** `demo-websocket-exception.filter.ts`；`demo-database.service.ts` / controller
- **最小修复建议:** 重命名为表达业务意图的名称（非 reshape 动词）。

#### GNL-AUD-029

- **标题:** 移除 Demo 后 bootstrap 仍硬编码 `DemoSocketIoAdapter`
- **类型:** Demo 边界 / DX
- **维度:** D6 / D14
- **严重度:** Low
- **置信度:** High
- **证据类型:** Inspected
- **位置:** `configure-application.ts` import/使用 `DemoSocketIoAdapter`
- **最小修复建议:** 重命名为 common adapter 或条件注册。

#### GNL-AUD-030

- **标题:** `AGENTS.md` 首行标题误写为 `# CLAUDE.md`
- **类型:** 元数据
- **维度:** D12
- **严重度:** Low
- **置信度:** High
- **证据类型:** Inspected
- **最小修复建议:** 修正 H1 或明确与 CLAUDE.md 的关系。

### 6.5 Info

#### GNL-AUD-018

- Demo 示例账号 `admin@example.com` / `admin12345`：示例性质，README/安全文档有上下文；**不单独升为漏洞**。

#### GNL-AUD-019

- Compose 内示例密钥：README 已警告替换；仍提醒勿用于真实生产。

#### GNL-AUD-020

- CI 不启 MySQL/Redis：与模板“运行时硬依赖”并存；属验证策略选择，计入 Needs Verification。

#### GNL-AUD-031

- 生产默认仍加载 `DemosModule`：模板可移除设计；**部署方责任**。若未移除即上生产，示例登录/debug-sentry/上传等面可达——记为部署风险提示，不单独升为代码 Blocker。

### 6.6 Accepted Design

1. Demo/Health 使用 `VERSION_NEUTRAL`（探针与示例路径稳定）——根路由除外见 AUD-007。
2. auth/crypto 由 feature 按需 import，不必全部进 AppModule。
3. cors/openapi/asyncapi/security 以 bootstrap 配置函数接入。
4. `SESSION_ENABLED=true` 在 production 抛错，阻止 MemoryStore 误用。
5. 生产强制 `DB_SYNCHRONIZE=false`（与迁移流程正确性是不同问题）。
6. test 环境排除 `DemoQueueModule` / BullMQ lazy：为隔离，需防生产泄漏（当前未见泄漏证据）。

### 6.7 Environment Blockers

1. 无 Docker CLI → 无法校验 `docker compose config` 与镜像构建。
2. 未启动 MySQL/Redis → 无法验证完整应用启动、readiness 真值、queue/cache 集成。

### 6.8 Needs Verification

1. 完整 `AppModule` + `configureApplication` 冷启动冒烟。
2. 容器内修正 glob 前后的 `migration:run` 实际效果。
3. 生产 JSON 日志链路（采集器）是否完整保留 req headers。
4. AsyncAPI 相关 critical 依赖是否进入生产运行时 require 图（需依赖图确认）。

---

## 7. 测试与 Coverage 分析

| 项       | 结果（Executed）                                                          |
| -------- | ------------------------------------------------------------------------- |
| Unit     | 84 suites / 349 tests — Pass                                              |
| E2E      | 4 suites / 10 tests — Pass                                                |
| Coverage | Statements ~83.43% / Branches ~44.82% / Functions ~92.75% / Lines ~85.79% |

低覆盖/零覆盖代表文件（Inspected from coverage-final）：

- `src/main.ts`、`src/instrument.ts`、`src/repl.ts`、`config/typeorm.data-source.ts`、migration 文件（可接受）
- `src/common/rate-limit/rate-limit.config.ts`（~38% stmt）
- `src/common/auth/auth-token.service.ts`（~68%）
- `jwt-auth.guard.ts` / `local-auth.guard.ts`（薄封装，~73%）
- `demo-sse.service.ts` 分支偏低

配对缺口（非平凡，代表性）：upload service、events listener/log service、部分 auth guards；多数 DTO/module 无同名 spec 可接受若被间接覆盖。

假阳性风险：

- e2e 不启 versioning → 根路由假绿（AUD-007）
- auth.guard.spec mock `verifyAsync` 不验证 options → 掩盖 AUD-001
- 无 DB/Redis → “全绿 CI” ≠ 可运行模板

---

## 8. 代码、配置、API 与文档不一致项

| #   | 声明来源                               | 实际实现                        | 可能过时方 | 用户影响     | 修正建议                        |
| --- | -------------------------------------- | ------------------------------- | ---------- | ------------ | ------------------------------- |
| 1   | README Quick Start 两行命令            | 需要 MySQL/Redis/env/migration  | 文档       | 启动失败     | 扩展 Quick Start（AUD-005）     |
| 2   | README/AGENTS：生产用 migrations       | runtime glob 错误 + Docker 不跑 | 实现       | 空库无表     | 修 glob + entrypoint（AUD-004） |
| 3   | JWT_ISSUER/AUDIENCE 配置与 JwtStrategy | AuthGuard 忽略                  | 手写 Guard | 鉴权不一致   | 对齐校验（AUD-001）             |
| 4   | 严格 TypeScript 表述                   | noImplicitAny false 等          | 文档或配置 | 误判安全强度 | 对齐（AUD-012）                 |
| 5   | configuration.md Env 表                | validation.ts 更多键            | 文档       | 漏配         | 同步（AUD-011）                 |
| 6   | e2e `GET /`                            | 生产可能 `/v1/`                 | 测试       | 契约漂移     | 统一（AUD-007）                 |
| 7   | health ready 暗示就绪                  | 不含 Redis                      | 语义/文档  | 错误切流量   | 扩展探针或改文档（AUD-010）     |

---

## 9. 横切风险

- **架构边界:** common/features 方向健康；双轨 Auth 是主要认知陷阱。
- **安全:** 鉴权分裂 + 日志脱敏 + 依赖漏洞构成最高优先级组合。
- **数据与异步:** 迁移路径断裂是部署级风险；上传 TTL、WS 房间、Redis readiness 影响可靠性。
- **可观测性:** Pino/Sentry 骨架在，缺默认脱敏与文档约束。
- **部署运维:** Dockerfile 可用但缺迁移、非 root、compose 未在本机校验。
- **模板维护成本:** Demo 数量多、文档面广；配置/文档/测试契约漂移成本会累积。

---

## 10. 未验证项、环境阻塞与剩余盲区

| 项                             | 原因           | 受影响结论        | 当前上限                   | 后续所需                                |
| ------------------------------ | -------------- | ----------------- | -------------------------- | --------------------------------------- |
| Compose/镜像构建               | 无 docker CLI  | 交付完整性        | 相关维 ≤3（且已有 High→2） | 安装 Docker 后 `compose config` + build |
| MySQL/Redis 真集成             | 审计禁启服务   | 运行时可验证性    | 不得宣称生产就绪           | CI services 或本地依赖                  |
| 全量 AppModule e2e             | 现有测试设计   | 中间件/versioning | Medium 已计                | 新增长 e2e                              |
| AsyncAPI critical 运行时可达性 | 未做完整依赖图 | AUD-003 部分权重  | Assumed 降权               | `pnpm why`/打包分析                     |

不得用“应当没问题”替代上述盲区。

---

## 11. 分阶段修复路线图（只建议，不实施）

### Phase 0 — High / 安全与数据

| ID          | 预期收益              | 风险                  | 验证                      |
| ----------- | --------------------- | --------------------- | ------------------------- |
| GNL-AUD-001 | 消除 JWT 双轨绕过     | 触及 auth 公共行为    | 单测 + 授权 demo 回归     |
| GNL-AUD-002 | 防止 token/会话进日志 | 日志字段变化          | logger 单测 + 抽样日志    |
| GNL-AUD-004 | 恢复可部署迁移路径    | 影响 Docker/启动脚本  | build 产物断言 + 空库迁移 |
| GNL-AUD-003 | 降低已知 CVE 暴露     | 依赖升级可能 breaking | audit + 测试全绿          |

### Phase 1 — Medium / 契约与测试

- GNL-AUD-006/007：加深 e2e，统一根路由版本契约
- GNL-AUD-005/011/023：Quick Start + configuration 同步 + 幽灵 DTO
- GNL-AUD-008/009/010/021：WS 授权、上传 TTL、Redis readiness、health SkipThrottle
- GNL-AUD-012/013：类型宣称对齐 + 关键补测
- GNL-AUD-022/024/025/026：shutdown hooks、生产 DB 强制项、cache singleflight、offline queue

### Phase 2 — Low / DX

- GNL-AUD-014 非 root 容器
- GNL-AUD-015 认证路径文档化
- GNL-AUD-016/017 分支覆盖与注释收敛
- GNL-AUD-027/028/029/030：coverage 阈值、命名禁令、adapter 边界、AGENTS 标题

### Human Decisions（需确认）

- 是否废弃手写 `AuthGuard`，只保留 Passport 路径（公共 API/auth 变更）。
- 根路由是否保持无版本或改 `/v1`（公共 API）。
- Docker 是否在启动前强制 migration（部署策略）。
- 是否将 AsyncAPI 工具链移出生产依赖。
- CI 是否引入 MySQL/Redis service（成本与稳定性权衡）。
- 生产构建是否默认排除 `DemosModule`（GNL-AUD-031）。

---

## 12. 附录

### 12.1 计数盘点（Inspected）

| 类别                           |                     约数 |
| ------------------------------ | -----------------------: |
| Nest `*.module.ts`（src）      |                       36 |
| Feature 模块                   |                       23 |
| Unit suites（`pnpm run test`） |                       84 |
| Unit cases                     |                      349 |
| E2E suites / cases             |                   4 / 10 |
| common 一级子目录              |                   ~18–19 |
| 审计开始 `git status` 条目     |                       62 |
| 审计结束新增仓库路径           | `docs/audits/`（本报告） |

### 12.2 六分区实际覆盖

| 分区                 | 覆盖方式                                                                            | 主控复核 |
| -------------------- | ----------------------------------------------------------------------------------- | -------- |
| A 完成度/架构/清晰度 | [审计完成度与架构](ca0d3253-72ef-49ca-88f8-603bb9d01bd8) + 主控                     | 是       |
| B 正确性/可靠性      | [审计正确性与可靠性](1556e209-8159-4538-84e4-b4ecb2f67147) + 主控                   | 是       |
| C 安全/供应链        | [审计安全与供应链](8a964c5e-2be2-439d-95b7-96e42ce2ef92) + 主控 Executed audit/JWT  | 是       |
| D 测试质量           | [审计测试与覆盖](349a4458-ef97-43b3-8a3c-8e25c29894ba) + 主控 Executed test/cov     | 是       |
| E 文档契约           | [审计文档与契约](9cb6a651-28df-4288-8f67-16cd6c8e5e8d) + 主控                       | 是       |
| F 配置/数据/交付/DX  | [审计配置交付与DX](3f709c81-0f2d-419f-b4bb-cd4330cb0ef2) + 主控 Executed build 路径 | 是       |

说明：分区子任务用于加速取证；正式 finding 经主控打开证据位置复核。**驳回/降权示例**：配置分区曾称 runtime migration glob 与布局匹配——与主控 `pnpm run build` 后 `dist/migrations` 不存在、`dist/src/migrations` 存在的 Executed 证据冲突，以 **GNL-AUD-004** 为准。安全分区将 AuthGuard iss/aud 标为低–中——主控 Executed 复现错误 iss/aud 仍可通过手写路径，维持 **High**。

### 12.2.1 补录变更（相对初版报告）

新增 Medium：GNL-AUD-021–026；新增 Low：027–030；新增 Info：031；扩展 GNL-AUD-001 覆盖 WebSocket `verifyAsync`。计数更新为 Medium **15** / Low **8** / Info **4**。Overall readiness 仍为 **2/5**（High 未变）。

### 12.3 重点搜索与命令摘要

- 搜索关键词：`RUNTIME_MIGRATION`、`VERSION_NEUTRAL`、`redact`、`AuthGuard`、`SESSION_ENABLED`、`chunkedUploadSessions`
- 关键探针：`JwtService.verifyAsync` iss/aud；`pino.stdSerializers.req`；`ls dist/migrations` vs `dist/src/migrations`
- 完整命令矩阵见第 3 章

### 12.4 Not Applicable 理由（能力矩阵）

- 多数 Demo 无独立 e2e：模板策略选择，计入测试缺口而非“能力缺失”。
- `main.ts`/`instrument.ts` 无单测：启动入口通常靠 e2e/手工；当前 e2e 未覆盖完整装配，已记 Needs Verification。
- Compodoc/OpenAPI 无单元测试：文档生成工具链，Executed 命令验证即可。

### 12.5 被忽略验证产物

本次动态验证可能生成/更新（gitignore）：`dist/`、`coverage/`、`documentation/`。

### 12.6 Mutation Guard 结果（Executed）

| 检查                                       | 结果                                                           |
| ------------------------------------------ | -------------------------------------------------------------- |
| 相对审计开始，git status 新增              | 仅 `?? docs/audits/`                                           |
| 是否改动既有源码/配置/锁文件/测试/既有文档 | **否**                                                         |
| 是否 commit/push/reset/checkout            | **否**                                                         |
| Canvas 位置                                | 仓库外 `~/.cursor/projects/.../canvases/`（非 git 工作区文件） |

### 12.7 完整性核对

| 检查项                     | 状态                  |
| -------------------------- | --------------------- |
| 12 固定章节齐全            | 是                    |
| D1–D15 均有分数与扣分理由  | 是                    |
| 能力矩阵无空白行           | 是                    |
| Findings 含完整字段        | 是（High/Medium/Low） |
| 动态验证失败未终止审计     | 是                    |
| 未引用 self-audit 历史分数 | 是                    |
| 未比较 HEAD 作为缺陷       | 是                    |
| 未实施修复                 | 是                    |

### 12.8 证据标签汇总

- **Executed:** lint/test/cov/build/e2e/compodoc/prettier/audit；JWT verify 探针；pino serializer 探针；dist 布局；mutation guard
- **Inspected:** 模块装配、守卫、health、upload、websocket、Dockerfile、文档、tsconfig、e2e 装配深度
- **Assumed:** 未启动服务下的完整运行时行为；部分传递依赖在生产 require 图中的精确可达性

---

_报告结束。_
