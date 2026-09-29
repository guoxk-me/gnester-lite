# gnester-lite 一次性完整项目审计报告

## 1. 审计元数据、范围与限制

| 项目              | 内容                                                              |
| ----------------- | ----------------------------------------------------------------- |
| 审计日期          | 2026-07-29（Asia/Shanghai）                                       |
| 工作区            | `/Users/guoxk/me/i/gnester-lite`                                  |
| 分支 / 修订元数据 | `master` / `7683b6a4433e`                                         |
| 平台              | Darwin 25.1.0 arm64                                               |
| Node.js / pnpm    | `v24.18.0` / `11.1.2`                                             |
| 审计基准          | 当前工作区内容，不以 HEAD 或历史报告替代                          |
| 工作区状态        | 428 个 porcelain 状态项；本报告不把既有 dirty tree 误认成审计写入 |
| 最终生产就绪结论  | **Conditional，3/5**                                              |
| 当前正式 findings | **0**                                                             |

本报告严格覆盖 `prompts/full-project-audit.md` 规定的目录、六个审计分区、D1–D15、
能力矩阵、命令矩阵和 19 个热点。最终清洁审计本身没有修复代码；在它之前，本轮目标
已经对发现的问题完成修复和回归，修复后的当前工作区是本次最终审计基准。因此，
“最终只读”不表示本轮从未发生过修复，而是表示最后一次从零复审期间除被忽略生成物
和本报告外没有再改变一方项目文件。

审计读取了 428 个当前存在的 tracked/unignored 一方文件，并检查了构建生成的
`src/metadata.ts`，合计 429 个；未说明原因的未检查一方文件为 0。三个既有
`docs/audits/*` 历史报告按提示词的历史自审隔离要求排除，不作为证据。`dist/`、
`coverage/`、`documentation/`、`node_modules/` 和生成的 `src/metadata.ts` 只作为
验证产物，不进入源码 mutation 指纹。

证据标签：

- **Executed**：实际运行并观察退出码或线缆行为。
- **Inspected**：逐文件、符号、依赖图、配置或契约检查。
- **Assumed**：缺少外部运行环境，只能作有限假设。

只读边界：

- 未连接或修改任何未被明确确认为可丢弃的 MySQL/Redis。
- 未执行 migration up/down/up、完整 `AppModule`、生产入口或外部 Sentry 投递。
- 环境没有 Docker CLI，因此没有拉取、构建或运行镜像。
- 未运行 watch/dev/repl，也未创建、生成、回滚 migration。

## 2. 执行摘要

最终清洁审计没有发现 Blocker、High、Medium、Low 或 Info 级正式缺陷。A/B
（架构与可靠性）、C/D（安全与测试）、E/F（契约、配置与交付）三组独立复审在最新
状态收敛为 0 finding；主控又完成全量门禁和交叉核验。

关键结果：

- **29 项有效验证 Pass，6 项因环境或安全边界 Blocked，2 组命令按审计边界
  Skipped。**
- 单测：101 suites / 743 tests 全部通过。
- e2e：默认配置与 CI 的 `CSRF_ENABLED=false` 配置各 7 suites / 29 tests 全部通过。
- Coverage：Statements 84.77%、Branches 49.07%、Functions 93.35%、Lines 87.12%，
  高于 70% / 40% / 70% / 75% 门槛。
- 全量 `--runInBand --detectOpenHandles`：101 suites / 743 tests 通过，无开放句柄。
- 构建：264 个 TypeScript 文件由 SWC 编译；`dist` 共 265 个文件，无 spec/source map。
- OpenAPI：23 个 HTTP controller、121 个 HTTP operation 均进入编译产物契约门禁。
- 容器引用策略：Dockerfile、Compose、CI 中 5 个外部镜像引用全部带不可变 digest。
- 生产依赖审计：无已知漏洞；peer 兼容性通过。
- 最终源码指纹前后均为
  `77700b3a4a4ac78d10b1c92a07e4c9bb16c1c7b906da26adf93f35608b176755`。

结论仍为 Conditional，而不是无条件 Ready。原因不是当前存在已确认代码缺陷，而是
Docker、真实 MySQL/Redis、migration round trip、完整应用装配和生产入口未能在本机
隔离环境中执行；这些是生产就绪的关键证据，按评分规则将总评封顶为 3/5。

## 3. 环境与验证命令矩阵

### 3.1 最终有效执行

| 命令                                                                | 状态 | 退出码 |   耗时 | 失败类型 | 证据摘要                                           |
| ------------------------------------------------------------------- | ---- | -----: | -----: | -------- | -------------------------------------------------- |
| `node --version`                                                    | Pass |      0 | <0.01s | —        | `v24.18.0`                                         |
| `pnpm --version`                                                    | Pass |      0 |  2.74s | —        | `11.1.2`                                           |
| `pnpm install --frozen-lockfile`                                    | Pass |      0 |  0.16s | —        | lockfile 与依赖已同步                              |
| `pnpm run lint:check`                                               | Pass |      0 | 26.75s | —        | ESLint 无错误                                      |
| `pnpm exec tsc -p tsconfig.build.json --noEmit --incremental false` | Pass |      0 | 12.86s | —        | 独立生产类型检查通过                               |
| `pnpm run typecheck`                                                | Pass |      0 | 20.72s | —        | build/test 两套 tsconfig 均通过                    |
| `pnpm run test`                                                     | Pass |      0 |  7.51s | —        | 101 suites / 743 tests                             |
| `pnpm run test:cov`                                                 | Pass |      0 | 11.18s | —        | 101 suites / 743 tests；全局阈值通过               |
| `pnpm exec jest --runInBand --detectOpenHandles`                    | Pass |      0 | 14.62s | —        | 743 tests；无开放句柄                              |
| `pnpm run build`                                                    | Pass |      0 |  2.45s | —        | TSC 0 issue；SWC 264 files                         |
| `pnpm run verify:artifact`                                          | Pass |      0 |  0.43s | —        | 生产入口、YAML、TypeORM、migration 产物存在        |
| `pnpm run verify:openapi`                                           | Pass |      0 |  0.99s | —        | 编译后 controller/operation 契约完整               |
| `pnpm run test:e2e`                                                 | Pass |      0 |  1.97s | —        | 7 suites / 29 tests                                |
| `CSRF_ENABLED=false pnpm run test:e2e`                              | Pass |      0 |  1.91s | —        | CI 环境重放 7 suites / 29 tests                    |
| `pnpm run compodoc`                                                 | Pass |      0 |  3.49s | —        | Compodoc 2.0.0 生成成功                            |
| `pnpm run format:check`                                             | Pass |      0 | 15.66s | —        | 包含 AGENTS/CLAUDE 与全部项目文档                  |
| 精确 Prettier 源码命令                                              | Pass |      0 | 11.97s | —        | `src/test/config` 全部匹配                         |
| 精确 Prettier 文档/配置命令                                         | Pass |      0 | 11.22s | —        | README、AGENTS、CLAUDE、docs、prompts、CI 匹配     |
| `pnpm run peers:check`                                              | Pass |      0 |  5.30s | —        | 无 peer dependency 问题                            |
| `pnpm run test:integration-policy`                                  | Pass |      0 |  3.82s | —        | fail-closed 策略 4/4                               |
| `pnpm run verify:container-references`                              | Pass |      0 |  3.63s | —        | 5 个引用均为 tag + sha256 digest                   |
| `pnpm run audit:prod`                                               | Pass |      0 |  5.90s | —        | `No known vulnerabilities found`                   |
| `node --check scripts/*.mjs`（逐文件）                              | Pass |      0 |  0.94s | —        | 7 个脚本语法通过                                   |
| `git diff --check`                                                  | Pass |      0 |  0.54s | —        | 无 whitespace error                                |
| 静态卫生/秘密/分层扫描                                              | Pass |      0 | <0.20s | —        | 无真实 any、抑制、focused test、反向依赖或秘密     |
| Markdown 相对链接检查                                               | Pass |      0 | <0.20s | —        | 23 个文档、16 个相对链接、0 broken                 |
| README/AGENTS/CLAUDE CI 顺序机械比对                                | Pass |      0 | <0.20s | —        | install → container policy → peers 一致            |
| CSRF 文档 Node JSON 提取 smoke                                      | Pass |      0 | <0.20s | —        | 正确取得合成 token，不依赖 jq                      |
| 构建产物/路由人工核对                                               | Pass |      0 | <0.20s | —        | 23 controllers、121 routes、265 files、0 forbidden |

### 3.2 Blocked 与 Skipped

| 命令                                               | 状态    | 退出码 |   耗时 | 失败类型             | 证据摘要                                 |
| -------------------------------------------------- | ------- | -----: | -----: | -------------------- | ---------------------------------------- |
| `docker compose config --quiet`                    | Blocked |    127 | <0.01s | Environment          | `docker: command not found`              |
| `docker build --tag gnester-lite:ci .`             | Blocked |      — |      — | Environment          | Docker CLI 不存在                        |
| `pnpm run verify:docker-image`                     | Blocked |      — |      — | Environment          | 没有可检查的本地镜像                     |
| `pnpm run verify:migrations`                       | Blocked |      — |      — | Safety / Environment | 未提供已确认可丢弃 MySQL                 |
| `pnpm run test:full-app`                           | Blocked |      — |      — | Safety / Environment | 未提供已确认可丢弃 MySQL/Redis           |
| `pnpm run verify:production-start`                 | Blocked |      — |      — | Safety / Environment | 依赖前述隔离基础设施                     |
| `start:dev` / `start:debug` / `start:repl` / watch | Skipped |      — |      — | Scope                | 长驻进程，不适用于一次性只读审计         |
| migration create/generate/run/revert               | Skipped |      — |      — | Safety               | 会改变 schema 或工作区，未获隔离环境授权 |

### 3.3 中间失败、纠正与分类

这些记录不计入最终 Pass 数，也没有被隐藏：

- 一次脚本语法命令猜测了不存在的脚本路径，退出 1；按真实 `scripts/` 清单重跑 7 个
  文件后通过，分类为 **Invocation Error**。
- 一次带字面量 `-- --silent` 的 e2e 命令被 Jest 当成文件 pattern，得到 “No tests
  found”；改用正确参数后通过，分类为 **Invocation Error**。
- 一次 `CSRF_ENABLED=false` 并行 e2e 中匿名请求得到 400 而非 401；聚焦用例通过，
  随后同环境完整连续 5 次、独立复审 2 次及最终重放均 29/29 通过。当前无法复现，
  归入 **Transient / Needs Verification**，不伪造为已确认缺陷。
- 首次 `--detectOpenHandles` 在受限沙箱因本地监听 `EPERM` 失败；允许 loopback 后全量
  通过，分类为 **Environment**。
- 一次 coverage 虽退出 0，但报告 worker 被强制退出。`--detectOpenHandles` 定位到
  Sentry 测试启动的 macOS 环境探测子进程；测试改用
  `initWithoutDefaultIntegrations` 后，全量句柄诊断、普通单测及 coverage 均无该告警。
  这是已闭环的测试资源问题，不是当前 finding。
- 分区复审的一次 registry 查询出现 `ENOTFOUND`；主控最终 `pnpm run audit:prod`
  成功并返回 0 advisory，分类为 **Environment / Transient**。

## 4. D1–D15 评分卡

评分卡算术均值为 4.07/5；由于 D9、D10、D14、D15 的关键外部验证被阻塞，最终
生产就绪评级按规则封顶为 3/5。

| 维度                          | 分数 | 最高严重度 | 证据摘要                                                | 主要扣分原因                              |
| ----------------------------- | ---: | ---------- | ------------------------------------------------------- | ----------------------------------------- |
| D1 模板能力完成度             |    4 | 无         | 27 项规定能力均有实现、接线、测试和文档                 | 若干能力缺真实依赖验证                    |
| D2 功能正确性与错误处理       |    4 | 无         | 743 单测、29 e2e、并发/资源清理专项通过                 | 完整应用与真实依赖未启动                  |
| D3 认证与授权                 |    5 | 无         | 两类 guard 共享 JWT policy；401/403/200 e2e             | 无当前扣分                                |
| D4 HTTP 与会话安全            |    4 | 无         | CSRF、session fixation、Cookie、CORS、429 测试          | 真实 ingress 与多副本限流未验证           |
| D5 输入、网络、文件与秘密安全 |    4 | 无         | 严格 ValidationPipe、上传限额/symlink、日志/Sentry 脱敏 | 真实外部网络和平台未验证                  |
| D6 架构与依赖边界             |    5 | 无         | 263 生产 TS、473 内部边、无环/逆向/跨 feature           | 无当前扣分                                |
| D7 类型、清晰度与可维护性     |    5 | 无         | strict tsc、ESLint、无 any/抑制，命名规则通过           | 无当前扣分                                |
| D8 配置正确性                 |    5 | 无         | YAML/env 双验证；未知键和类型漂移失败关闭               | 无当前扣分                                |
| D9 数据库与迁移               |    3 | 无         | entity/migration/TypeORM glob/产物静态一致              | 无真实 migration round trip               |
| D10 异步与集成可靠性          |    3 | 无         | cache/queue/schedule/events/HTTP 生命周期单测           | 无真实 Redis、队列 worker、上游网络       |
| D11 测试覆盖与质量            |    4 | 无         | 全门禁通过；无开放句柄；全局阈值通过                    | Branch 49.07%，关键模块仍有中等盲区       |
| D12 API 与文档契约            |    5 | 无         | 121 OpenAPI operations、AsyncAPI、SSE、CI 文档一致      | 无当前扣分                                |
| D13 可观测性与健康检查        |    4 | 无         | Pino/Sentry fail-closed 隐私、DB/Redis readiness 逻辑   | 无真实 Sentry/依赖故障演练                |
| D14 构建、交付与仓库卫生      |    3 | 无         | build/artifact/Compodoc/digest/CI 静态门禁通过          | Docker Compose/build/image blocked        |
| D15 开发者体验与生产就绪度    |    3 | 无         | README/专题/agent 文档及 CI 顺序一致                    | production start 与完整 AppModule blocked |

## 5. 全量能力矩阵

| 能力            | common/bootstrap                                  | demo/consumer                        | module wiring                          | config                                    | unit tests                            | e2e                             | docs                      | runtime dependency             | 状态     | 证据                                         |
| --------------- | ------------------------------------------------- | ------------------------------------ | -------------------------------------- | ----------------------------------------- | ------------------------------------- | ------------------------------- | ------------------------- | ------------------------------ | -------- | -------------------------------------------- |
| auth            | `common/auth`、全局/局部 guards                   | `demo-auth`                          | AppModule + DemoAuthModule             | JWT secret/TTL/issuer/audience            | token、guard、strategy、password      | login/profile/过期/claims       | security、demo、OpenAPI   | 无外部依赖                     | Complete | `auth-token.service.ts`；`app.e2e-spec.ts`   |
| authorization   | roles/permissions/policies guards/decorators      | `demo-authorization`                 | CommonAuthorizationModule + feature    | JWT roles/permissions                     | 三类 guard specs                      | 401/403/200 矩阵                | security、demo、OpenAPI   | auth identity                  | Complete | authorization specs；app e2e                 |
| cache           | `CommonCacheModule/Service`、HTTP interceptor     | `demo-cache`                         | AppModule + feature                    | YAML TTL、REDIS_URL                       | 命名空间、vary、并发、关闭            | HTTP cache slice                | cache、demo               | Redis                          | Partial  | cache specs 通过；真实 Redis blocked         |
| configuration   | ConfigModule、YAML/env validators                 | 全部能力                             | AppModule、CLI data source、instrument | YAML + env + prod constraints             | config 相关 specs                     | bootstrap/e2e 间接              | configuration             | 文件系统/env                   | Complete | 未知键、quoted boolean、secret policy tests  |
| cookies         | cookie-parser + cookie helpers                    | `demo-cookies`                       | shared bootstrap + feature             | secret/name/secure/sameSite               | controller/service/cookie-name        | session/cookie 行为间接         | security、demo            | HTTP client cookie jar         | Complete | signed clear/属性测试                        |
| cors            | `createCorsOptions` + SocketIoAdapter             | `demo-cors`、WebSocket               | `configureApplication`                 | origins/enabled/credentials               | canonical origin/bootstrap tests      | WS origin、credentialed slice   | security、websocket、demo | ingress/browser                | Partial  | 真实 HTTP preflight/ingress 未验证           |
| crypto          | encryption/HMAC/token services                    | `demo-crypto`                        | CommonCryptoModule + feature           | encryption/HMAC secrets                   | tamper、length、round-trip            | controller slice                | security、demo            | Node crypto                    | Complete | crypto specs                                 |
| csrf            | CsrfService + bootstrap middleware/error handler  | `demo-csrf`及所有 mutation           | CommonCsrfModule + bootstrap           | enabled/secret/cookies/header             | service/bootstrap/config              | token/cookie/mutation           | security、README、OpenAPI | browser cookies                | Complete | CSRF e2e；CI disabled 重放                   |
| database        | TypeORM config/entity/migration                   | `demo-database`                      | AppModule + feature                    | DB\_\*、sync forced off                   | service/controller/entity/migration   | slice only                      | database、README          | MySQL 8                        | Partial  | build/glob verified；migration blocked       |
| events          | EventEmitter platform wiring                      | `demo-events` listener/service       | Common events + feature                | 无额外配置                                | emit/listener/history                 | controller slice                | demo/project map          | 进程内 event loop              | Complete | events specs                                 |
| health          | Terminus、DB/Redis indicators                     | `/health/live/ready`                 | CommonHealthModule                     | DB/Redis/runtime                          | controller/indicator/shutdown         | probe routing slice             | health、README            | MySQL/Redis                    | Partial  | 真实 dependency outage 未演练                |
| http-client     | Axios module/options/cache interaction            | `demo-http`                          | CommonHttpClientModule + feature       | base URL/timeout/limits                   | retries/limits/status URL privacy     | controller slice                | demo/configuration        | 外部 HTTP 网络                 | Partial  | 真实上游 blocked                             |
| logger          | nestjs-pino、header-free serializers              | 全应用                               | CommonLoggerModule + main              | LOGGER_JSON/LEVELS                        | real pino-http sentinel、probe filter | 间接经 app                      | logger、health            | stdout/log backend             | Complete | request/response/query/credential 均不落日志 |
| openapi         | setup/config + SWC metadata                       | 23 HTTP controllers                  | bootstrap non-prod docs                | NODE_ENV、CSRF header                     | config/contract specs                 | compiled verifier               | openapi、README           | 无                             | Complete | 121/121 operations verified                  |
| asyncapi        | AsyncAPI document service/controller              | WebSocket gateway/events             | DemoWebsocketModule                    | non-production exposure                   | schema/event/direction/import tests   | WS e2e 间接                     | asyncapi、websocket       | Socket.IO                      | Complete | payload-free scenarios request 显式建模      |
| queue           | BullMQ module/service/processor                   | `demo-queue`                         | CommonQueueModule + feature            | Redis、enabled、attempt/backoff/retention | admission、timeout、events、processor | slice/policy                    | queue、demo               | Redis/BullMQ worker            | Partial  | 真实 worker/Redis blocked                    |
| rate-limit      | HTTP-only throttler guard/config                  | `demo-rate-limit`、credential routes | CommonRateLimitModule                  | enabled/trust proxy/throttlers            | config、guard、bootstrap              | 429/forwarded IP slice          | security、demo            | 单实例内存；多实例需共享 store | Partial  | 多副本语义未动态验证                         |
| schedule        | ScheduleModule/service lifecycle                  | `demo-schedule`                      | CommonScheduleModule + feature         | enabled/time zone                         | dynamic jobs、drain、disabled         | controller slice                | schedule、demo            | timers/clock                   | Complete | schedule 相关 specs                          |
| security/helmet | Helmet options + bootstrap ordering               | `demo-security`                      | shared bootstrap + feature             | environment                               | options/bootstrap                     | security headers slice          | security、demo            | reverse proxy/TLS              | Complete | Helmet/ordering tests                        |
| sentry          | early instrument + privacy hooks/filter           | `demo-sentry`、后台任务调用点        | instrument first + module              | DSN/enabled/sample rate                   | envelope/span/privacy/isolation       | 无外部投递                      | sentry                    | 外部 Sentry                    | Partial  | 本地 final envelope 通过；平台投递未验证     |
| serialization   | global/ClassSerializer usage                      | `demo-serialization`                 | feature/interceptor                    | 无额外配置                                | DTO/interceptor/controller            | HTTP final body slice           | serialization、demo       | 无                             | Complete | password/internal 字段不出线缆               |
| session         | express-session bootstrap + bounded service       | `demo-session`                       | bootstrap + feature                    | enabled/secret/cookie/TTL                 | fixation、limits、destroy/rotation    | session e2e                     | security、demo            | dev MemoryStore；prod 禁止     | Complete | 生产启用 MemoryStore 会 fail fast            |
| sse             | Nest `@Sse` + cache/proxy contract                | `demo-sse`                           | feature                                | compression interaction                   | service/controller/finalization       | adapter-level header e2e        | demo、OpenAPI             | 长连接/timers/proxy            | Complete | 完整 Cache-Control 线缆断言                  |
| streaming-files | StreamableFile/HTTP range helpers                 | `demo-streaming-files`               | feature                                | 无额外配置                                | headers/range/not-found/cleanup       | controller slice                | demo/OpenAPI              | 文件/内存流                    | Complete | streaming specs                              |
| upload          | Multer/storage/service/limits/locks               | `demo-upload`                        | feature                                | bounded constants                         | MIME、quota、chunk、cleanup、symlink  | HTTP multipart unit integration | demo/OpenAPI              | 临时文件系统                   | Complete | symlink/private mode/limit regressions       |
| validation      | strict global ValidationPipe + exception contract | 所有 DTO                             | bootstrap                              | DTO decorators                            | pipe、DTO、错误脱敏                   | 多个 400/422 场景               | validation、demo          | 无                             | Complete | whitelist/forbid/transform 在所有环境一致    |
| websocket       | SocketIoAdapter、guard/filter/pipe/interceptor    | demo gateway/service                 | DemoWebsocketModule                    | CORS/JWT                                  | gateway/service/filter/pipe/AsyncAPI  | 握手、auth、rooms、errors       | websocket、asyncapi       | Socket.IO 网络                 | Complete | WS e2e 与 AsyncAPI 方向一致                  |

Not Applicable 行为 0：仓库声明的 27 项能力均存在真实平台实现或 demo consumer，因此没有
用 N/A 掩盖缺口。

## 6. 详细 Findings、已接受设计与环境分类

### 6.1 当前正式 Findings

- **Blocker：无。**
- **High：无。**
- **Medium：无。**
- **Low：无。**
- **Info：无。**

“无正式 finding”只表示在当前代码、当前证据和审计边界内没有可复现缺陷；不把
Environment Blocker 或 Needs Verification 混入缺陷数量。

### 6.2 在最终清洁审计前已闭环的问题

| 已闭环问题                                       | 根因修复                                          | 关键证据                          |
| ------------------------------------------------ | ------------------------------------------------- | --------------------------------- |
| quoted YAML boolean 改变语义                     | 禁止隐式标量转换并增加类型回归                    | `config/configuration.ts/spec.ts` |
| YAML 未知 root/nested/throttler 键静默保留       | 递归 whitelist + forbidNonWhitelisted             | configuration tests               |
| `NODE_ENV` 可影响 env 文件路径                   | 环境名 allowlist/安全路径                         | `environment-files.ts/spec.ts`    |
| malformed Redis URL 错误暴露 userinfo            | 安全错误契约，不回显 URL                          | validation/integration-policy     |
| HTTP provider status 暴露 URL userinfo/query     | 清除 user/password/search/hash                    | demo-http specs                   |
| Pino query、未知请求/响应 header 泄漏            | request/response 显式元数据白名单                 | real pino-http sentinel 17/17     |
| Sentry request/span/URL 泄密                     | deny-by-default collection + final envelope scrub | sentry privacy specs              |
| Sentry 测试遗留 SDK host-discovery 子进程        | 测试使用无默认集成初始化                          | 743 tests + detectOpenHandles     |
| 上传目录可预测/symlink 攻击                      | 私有目录与 symlink 目标保护                       | upload storage specs              |
| ValidationPipe 在生产失去稳定错误行为            | 所有环境统一严格 pipe                             | validation/bootstrap tests        |
| 清除 malformed signed cookie 触发 Express 500    | 安全清除语义                                      | cookie tests                      |
| 数据库 PATCH stale save race                     | 原子更新/并发语义                                 | database service specs            |
| `@Public` 与 controller auth 语义死表面          | 明确 escape hatch 并 e2e                          | app e2e                           |
| AsyncAPI 与 WS 方向/消息漂移                     | 逐事件映射；无 payload request 显式 message       | AsyncAPI specs/docs               |
| OpenAPI 只装配部分 controllers                   | 编译后自动发现全部 HTTP controllers               | 23 controllers / 121 operations   |
| auth/session/rate/validation/Sentry/e2e 门禁缺口 | 增加行为门禁和 CI 顺序                            | CI + 743/29 tests                 |
| 生产入口只验证编译、不验证启动                   | CI 增加 fail-closed production smoke              | integration policy 4/4            |
| 外部容器镜像仅使用移动 tag                       | tag + multi-platform digest；静态 CI gate         | 5 references verified             |
| SSE 文档 Cache-Control 与线缆不同                | controller/OpenAPI/docs 共用完整值 + e2e          | `sse.e2e-spec.ts`                 |
| CSRF 示例隐含 `jq`                               | 改用必需的 Node.js 内置 JSON 读取                 | README/security smoke             |
| 容器策略脚本未进入“完整 CI”文档                  | README/AGENTS/CLAUDE 同步顺序                     | 机械顺序比对                      |
| 架构、命名和专题文档零散不一致                   | 按既有双层架构收敛并补测试/说明                   | graph、lint、docs link gate       |

### 6.3 Accepted Design

- `src/common` 提供平台能力、`src/features` 提供可移除 demo，未发现反向或跨 feature
  依赖；这是模板职责分离，不是过度分层。
- demo 在生产环境排除，平台 common 能力仍保留；OpenAPI/AsyncAPI 仅在非生产暴露。
- express-session MemoryStore 只用于非生产演示；生产若误启用会启动失败，而不是静默
  使用不安全 store。
- `schedule.enabled` 控制实际调度执行；queue 的注册、延迟连接和业务 admission 边界
  已分别测试和说明。
- rate-limit 默认内存 store 适用于单实例模板；多副本必须接共享 store，文档已明确，
  当前不伪装成分布式能力。
- demo SSE 采用有限、连接本地的流与 ID；没有宣称持久化 replay。
- demo queue 在超时后可能已被 Redis 接受，这种分布式不确定性已作为契约说明，而非
  伪造 exactly-once。
- `.env.*` 中只保留本地示例/非秘密值，生产强度、重复使用、占位值和必填约束由
  validator 失败关闭。

### 6.4 Environment Blockers

- Docker CLI 不存在：Compose 解析、镜像拉取/build、non-root/runtime 文件/healthcheck
  的真实镜像验证均被阻塞。
- 没有用户确认的隔离、可丢弃 MySQL/Redis：migration round trip、完整 AppModule、
  BullMQ/Redis、readiness 故障和 production entry 被阻塞。
- 未提供外部 Sentry 项目和可丢弃网络目标：真实投递/采样/故障恢复未验证。

### 6.5 Needs Verification

- 在 GitHub runner 上观察新 digest gate 和双服务 CI 的长期稳定性。
- 对真实 ingress 执行 HTTP CORS preflight、可信代理 hop、IPv4/IPv6 与 spoofed
  forwarded-header 用例。
- 多实例限流接入共享 storage 后进行一致性和过载测试。
- 对真实 Redis 断连、BullMQ worker 重启、MySQL 迁移失败和优雅关停做故障注入。
- 对真实上游 HTTP、Sentry collector、日志采集器确认超时、隐私和重试边界。

## 7. 测试与 Coverage 分析

### 7.1 结果

| 层级               | 结果                        | 说明                                              |
| ------------------ | --------------------------- | ------------------------------------------------- |
| Unit/component     | 101 suites / 743 tests Pass | 包含 controller HTTP slices、并发、失败、资源清理 |
| Coverage           | 101 suites / 743 tests Pass | 84.77 / 49.07 / 93.35 / 87.12                     |
| Open handles       | 101 suites / 743 tests Pass | `--runInBand --detectOpenHandles` 无句柄          |
| E2E default        | 7 suites / 29 tests Pass    | auth/session/csrf/rate-limit/websocket/SSE 等     |
| E2E CI env         | 7 suites / 29 tests Pass    | `CSRF_ENABLED=false` 重放                         |
| Integration policy | 4/4 Pass                    | 破坏性命令无明确 opt-in 时失败关闭                |

### 7.2 覆盖质量

- 全局阈值为 Statements 70%、Branches 40%、Functions 70%、Lines 75%；实际全部超过。
- 关键中等分支覆盖包括 auth guard 45.16%、auth token 62%、CSRF 54%、
  authorization guards 45.16%、upload controller/storage/service
  48.48%/59.67%/61.29%。它们都有有效失败路径测试，但仍是后续强化优先区。
- `main.ts` / `repl.ts` 的 Jest coverage 为 0。`main.ts` 由构建、artifact、bootstrap
  unit 和 CI production-start gate补充；本机 production-start blocked，因此 D11/D15
  未给满分。
- 非平凡 service/controller/guard/strategy/filter/pipe/interceptor/adapter/gateway/
  processor/listener 均存在同名 spec 或等价行为覆盖。无同名 spec 的 Auth guards、
  event listener、serializer 和 AsyncAPI controller 已通过 e2e/真实 interceptor/
  controller service test 配对确认。
- 最终没有 `.skip`、`.only`、`fit`、`fdescribe` 或空壳断言。

## 8. 代码、配置、API 与文档一致性

| 契约                                  | 核对结果                                               | 证据                                           |
| ------------------------------------- | ------------------------------------------------------ | ---------------------------------------------- |
| YAML ↔ types ↔ validation ↔ docs      | 一致；类型漂移和未知键失败关闭                         | config specs、configuration docs               |
| env inventory ↔ validator             | 48 个字段机械对齐                                      | `.env.example`、`validation.ts`、template test |
| HTTP controllers ↔ OpenAPI            | 23 controllers / 121 operations 全覆盖                 | compiled verifier                              |
| WebSocket emit/subscribe ↔ AsyncAPI   | 方向、payload、error、无 payload request 一致          | AsyncAPI service specs                         |
| SSE runtime ↔ OpenAPI ↔ docs          | 完整 Cache-Control 与 X-Accel-Buffering 一致           | SSE e2e                                        |
| Pino/Sentry privacy ↔ docs            | 请求/响应/identity/query/URL 契约一致                  | real serializer/envelope tests                 |
| Docker/Compose/CI image refs ↔ policy | 5 个 digest 固定引用一致                               | container verifier                             |
| CI workflow ↔ README/AGENTS/CLAUDE    | install、image policy、peers 及后续顺序一致            | mechanical order check                         |
| build ↔ start:prod ↔ TypeORM ↔ Docker | `dist/src/main.js`、config、entity/migration glob 一致 | artifact/manual inventory                      |
| Markdown links                        | 0 broken                                               | 23 docs / 16 relative links                    |

残余已确认 mismatch：**0**。

## 9. 跨领域风险

1. **外部基础设施证据缺口**：数据库、Redis、migration、完整应用和生产入口未在本机
   执行，限制 D9/D10/D14/D15。
2. **多实例拓扑**：默认内存限流和单进程 schedule 语义合理，但不能代表多副本；上线
   前必须使用共享协调方案。
3. **关键分支覆盖余量**：总 branch 49.07% 仅高于门槛 9.07 个百分点；auth、CSRF、
   authorization、upload 应优先增加表驱动失败路径。
4. **外部观测与网络**：本地隐私 hook 已验证，但真实 Sentry、日志 backend、代理和
   上游 HTTP 的最终行为仍取决于部署环境。
5. **交付基准**：当前工作区有 428 个状态项。本报告审计的是这一具体内容快照；合并前
   应由维护者审查变更集并通过真实 CI，不能仅依赖本地 dirty tree。

这些是风险或验证缺口，不是当前确认缺陷。

## 10. 未验证路径、阻塞项与盲区

| 路径                      | 当前证据                        | 缺失证据                       | 对结论影响      |
| ------------------------- | ------------------------------- | ------------------------------ | --------------- |
| Docker Compose            | 静态 YAML、digest gate          | `docker compose config`        | D14 最高 3      |
| Production image          | Dockerfile、artifact gate       | build/run/non-root/healthcheck | D14/D15 最高 3  |
| Migration                 | migration 源码、编译产物、glob  | MySQL up/down/up               | D9 最高 3       |
| Full AppModule            | slice tests、module graph       | 真实 MySQL/Redis 启动          | D2/D10/D15 扣分 |
| Production entry          | build、script policy            | listen/probe/terminate         | D15 最高 3      |
| Redis/BullMQ              | unit/mocks/lifecycle            | 断连、重连、worker restart     | D10 最高 3      |
| DB/Redis readiness        | indicator specs                 | 真实故障/恢复                  | D13 扣分        |
| HTTP CORS/ingress         | config/bootstrap/WS origin      | 真实 preflight/proxy chain     | D4 扣分         |
| Multi-instance rate-limit | 单实例 e2e、文档                | shared store/load test         | D4/D10 扣分     |
| Sentry/log backend        | final local envelope/serializer | 外部 collector 最终数据        | D5/D13 扣分     |
| GitHub CI                 | workflow 静态一致               | 最新变更的真实 runner run      | Conditional     |

## 11. 分阶段改进路线

当前没有需要立即修复的 P0/P1 正式 finding。后续路线用于解除 Conditional，而不是
掩盖缺陷：

### Phase 0 — 合并前必做

1. 在真实 GitHub CI 运行完整序列，确认 pinned image 可拉取。
2. 在 disposable MySQL/Redis 上通过 migration up/down/up、full-app 和
   production-start。
3. 构建并运行 Docker image，验证 non-root、只读 runtime assets、TypeORM CLI 和
   `/health/ready`。

### Phase 1 — 测试深化

1. 将 auth/authorization/CSRF/upload 关键分支提高到至少 70%。
2. 增加真实 HTTP CORS preflight 和 bootstrap compression + SSE 组合 e2e。
3. 增加 Redis/BullMQ/MySQL 故障注入和 shutdown deadline 测试。

### Phase 2 — 多实例与运维

1. 为多副本 rate-limit、schedule 和 session 选择共享 storage/leader 策略。
2. 对真实 ingress、日志 backend、Sentry 与上游 HTTP 运行隐私和超时验收。
3. 使用受控自动化定期更新容器 tag+digest，并保留变更审查。

## 12. 附录

### 12.1 Inventory

| 范围                            |  已检查 | 未检查 |
| ------------------------------- | ------: | -----: |
| `src/common/**/*.ts`            |      93 |      0 |
| `src/features/**/*.ts`          |     238 |      0 |
| `src/bootstrap/**/*.ts`         |       5 |      0 |
| `src/migrations/**/*.ts`        |       2 |      0 |
| 其余 `src/*`                    |      11 |      0 |
| `config/**/*`                   |      16 |      0 |
| `test/**/*`                     |      11 |      0 |
| `scripts/**/*`                  |       7 |      0 |
| `docs/**/*`（排除历史 audits）  |      18 |      0 |
| `prompts/**/*`                  |       2 |      0 |
| 根级与隐藏构建/CI/环境配置      |      25 |      0 |
| 当前 tracked/unignored manifest | **428** |  **0** |
| 生成的 `src/metadata.ts`        |       1 |      0 |

角色计数：

| 角色                |                       数量 |
| ------------------- | -------------------------: |
| modules             |                         36 |
| controllers         | 24（23 HTTP + 1 AsyncAPI） |
| services            |                         34 |
| DTOs                |                         92 |
| guards              |                          8 |
| interceptors        |                          2 |
| pipes               |                          2 |
| filters             |                          1 |
| gateways            |                          1 |
| processors          |                          1 |
| adapters            |                          1 |
| entities            |                          1 |
| unit `*.spec.ts`    |                        101 |
| e2e `*.e2e-spec.ts` |                          7 |

清单由当前文件系统和 `git ls-files -co --exclude-standard` 的并集生成，并按上述无遗漏
glob 分区逐项读取；不是抽样文件名。三个历史 audit 文件只计为明确排除项。一次宽泛
`rg` 曾返回其中的匹配行，但未打开、引用或使用历史报告形成评分。

### 12.2 六分区覆盖

| Lane                | 实际覆盖                                                          | 结论      |
| ------------------- | ----------------------------------------------------------------- | --------- |
| A 架构/分层         | 263 生产 TS、473 runtime edges、modules/controllers/services      | 0 finding |
| B 正确性/可靠性     | cache/queue/schedule/upload/stream/SSE/WS/shutdown/concurrency    | 0 finding |
| C 安全/供应链       | auth/authz/CSRF/session/CORS/validation/logger/Sentry/Docker/deps | 0 finding |
| D 测试/质量         | 743 unit、29 e2e、coverage、open handles、type/lint/format        | 0 finding |
| E API/文档          | 121 HTTP operations、AsyncAPI、README/专题/links                  | 0 finding |
| F 配置/数据/交付/DX | YAML/env/TypeORM/health/CI/Docker/artifact/scripts                | 0 finding |

### 12.3 19 个强制热点

|   # | 热点                                     | 判定     | 证据                                                 |
| --: | ---------------------------------------- | -------- | ---------------------------------------------------- |
|   1 | Passport JWT guard 与手写 AuthGuard 双轨 | 设计合理 | 共享 `readJwtPolicy`/payload validator；e2e 同时验证 |
|   2 | Redis readiness                          | 尚需验证 | indicator/health tests 通过；真实 Redis blocked      |
|   3 | VERSION_NEUTRAL 与 `/v1`                 | 设计合理 | root/health/demo 文档与 route tests                  |
|   4 | e2e 绕过完整 AppModule/bootstrap         | 尚需验证 | slice 明确；full-app/production blocked              |
|   5 | 非平凡组件测试缺口                       | 设计合理 | 直接/等价配对清单；101 specs                         |
|   6 | queue/schedule enabled 语义              | 设计合理 | 注册、执行、admission、文档一致                      |
|   7 | 生产 MemoryStore                         | 设计合理 | production fail-fast；CI/session disabled            |
|   8 | Sentry 后台 isolation/capture            | 尚需验证 | unit/local envelope 通过；外部平台未验证             |
|   9 | sync off 时 migration 部署               | 设计合理 | Compose migrate gate + CI round trip 脚本            |
|  10 | Quick Start 前置                         | 设计合理 | Node/pnpm/MySQL/Redis/env 已声明                     |
|  11 | strict TypeScript                        | 设计合理 | strict configs + 两套独立 tsc 通过                   |
|  12 | 示例凭据边界                             | 设计合理 | 本地示例；生产 validator 拒绝占位/弱/复用            |
|  13 | config helper/注释/命名                  | 设计合理 | lint、命名与语义检查无 finding                       |
|  14 | test 特殊分支掩盖生产                    | 尚需验证 | production assembly 脚本存在；真实启动 blocked       |
|  15 | bootstrap 顺序                           | 设计合理 | configure-application spec + e2e                     |
|  16 | SWC/tsc/ESLint 一致门禁                  | 设计合理 | build、exact tsc、typecheck、lint 全通过             |
|  17 | 构建后的 migration/entity/config 路径    | 设计合理 | artifact + 手工 dist inventory                       |
|  18 | e2e slice 与生产装配                     | 尚需验证 | 7 slice suites 通过；full app blocked                |
|  19 | `.env.*`/Docker 示例/审计秘密            | 设计合理 | secret scan 0；错误/报告不含凭据值                   |

### 12.4 Mutation Guard

- 最终清洁审计前指纹：
  `77700b3a4a4ac78d10b1c92a07e4c9bb16c1c7b906da26adf93f35608b176755`
- 所有最终门禁后、写报告前指纹：
  `77700b3a4a4ac78d10b1c92a07e4c9bb16c1c7b906da26adf93f35608b176755`
- 指纹文件数：428。
- 允许生成物：`node_modules/`、`dist/`、`coverage/`、`documentation/`、
  `src/metadata.ts`。
- 允许新增文件：本报告。
- 结论：**最终清洁审计未修改既有一方源码、配置、测试或文档。**

### 12.5 审计安全说明

- 未输出或提交真实 secret、cookie、token、数据库密码或 Sentry payload。
- 合成 sentinel 只存在测试进程中。
- 未进行破坏性数据库、队列或文件系统操作。
- 未 commit、stage、push 或创建 PR。
