# gnester-lite 一次性完整只读审计报告

> 结论标签：`Executed` 表示实际执行验证；`Inspected` 表示从当前工作区代码、配置、测试或文档直接核对；`Assumed` 仅表示限制或待验证假设。  
> 审计模式：`AUDIT_ONLY`。本报告不实施修复。

## 1. 审计元数据、范围与限制

### 1.1 元数据

| 项目       | 值                                                                                    |
| ---------- | ------------------------------------------------------------------------------------- |
| 审计日期   | 2026-08-04（Asia/Shanghai，CST，UTC+08:00）                                           |
| 执行窗口   | 10:51:38–11:22:50（报告写入前的主要验证窗口）                                         |
| 工作区     | `/Users/guoxk/me/i/gnester-lite`                                                      |
| 审计对象   | 当前工作区内容；不以 `HEAD` 或历史审计为质量基线                                      |
| 分支元数据 | `master`，仅作元数据                                                                  |
| OS         | Darwin 25.1.0 arm64                                                                   |
| Node.js    | `v24.19.0`                                                                            |
| pnpm       | `11.1.2`；与 `packageManager` 声明一致                                                |
| 执行方式   | 主控 + 六分区两轮并行只读审计；主控独立复核 High 和代表性 Medium                      |
| 目标报告   | `docs/audits/2026-08-04-gnester-lite-full-audit.md`；写入前确认不存在，未覆盖历史报告 |

### 1.2 参数与边界

`Inspected`：调用者没有覆盖默认参数，采用 `prompts/full-project-audit.md` 的全部默认值：

| 参数                    | 本次值               | 执行解释                                         |
| ----------------------- | -------------------- | ------------------------------------------------ |
| 审计模式                | `AUDIT_ONLY`         | 不修复源码、测试、配置和现有文档                 |
| 安装既有依赖            | `CONDITIONAL`        | `node_modules` 已存在且版本匹配，未重复安装      |
| 只读网络检查            | `ALLOW_IF_AVAILABLE` | 执行生产依赖审计和版本元数据核对                 |
| Docker image build/run  | `DENY`               | 未构建或运行镜像；本机也没有 Docker CLI          |
| 可丢弃 MySQL/Redis 集成 | `DENY`               | 未执行迁移、完整应用和 production-start 深度命令 |
| 写入范围                | `REPORT_ONLY`        | 只创建本报告；构建工具可更新 ignored artifacts   |
| 输出                    | `zh-CN / FULL`       | 本报告为简体中文完整报告                         |

`Inspected`：已读取 `AGENTS.md`、`CLAUDE.md`、`README.md`、包与锁文件、pnpm workspace、四套 TypeScript 配置、Nest/SWC/Jest/ESLint/Prettier 配置、CI、Dockerfile、Compose、ignore 文件、环境变量模板和四种已跟踪环境文件的键名状态、全部 `scripts/**/*.mjs`、全部 `prompts/**/*.md`，以及清单范围内的一方源码、测试和现行文档。环境文件只核对键名、空值/占位性质和优先级，未输出任何真实值。

`Inspected`：历史 `docs/audits/**`、`docs/superpowers/**`、`prompts/self-audit-loop.md` 和 `.cursor/self-audit-state.md` 仅被分类，未将其分数、结论或“已完成”状态用作本次证据。第三方 `node_modules/` 与生成物 `dist/`、`coverage/`、`documentation/` 只在依赖、制品和 coverage 核验所需范围内读取。

`Executed`：开始状态为用户既有 dirty worktree，共 330 个 porcelain 条目；精确零字节状态指纹为 `4859990cee2a3844d65bd4de2e9a3eafa0453caa63ea9a2c5cdfea4f027d8717`。该状态只用于 mutation guard，不分析其相对 `HEAD` 的来源，也不计为质量缺陷。

### 1.3 外部限制

- `Executed`：Docker CLI 不可用，`docker compose config --quiet` 返回 127；Docker 配置解析、镜像构建和镜像内启动未动态验证。
- `Executed`：本机 3306 无监听；未获可丢弃 MySQL/Redis 双重安全门授权，因此未执行 migration up/down/up、完整 `AppModule` 或生产入口验证。
- `Executed`：本机 loopback 6379 有监听，但未把未知进程当作已授权的可丢弃 Redis，也未连接或写入。
- `Executed`：生产依赖漏洞数据库可访问；许可证/包清单命令受本地 pnpm package index/store 状态阻塞。
- `Assumed`：目标反向代理、编排平台、真实 Redis 持久性、数据库规模、Sentry transport 和多实例拓扑未知，不能由单机静态证据外推。

本次未比较 `HEAD`、未修复代码、未 commit、未 push。

## 2. 执行摘要

### 2.1 一句话结论

`Executed + Inspected`：gnester-lite 的静态质量门禁、单元/切片 e2e、coverage、构建、制品、OpenAPI 和 Compodoc 均通过，教学能力覆盖广且实现质量整体较好；但生产依赖审计实际命中 2 个 High 漏洞并使强制 CI 门禁失败，同时仍有关闭、健康诊断、Demo 边界、认证/Session 教学契约和生产运维文档缺口，因此当前为 **Not Ready**。

| 结论              | 结果                                                               |
| ----------------- | ------------------------------------------------------------------ |
| Overall readiness | **2/5**                                                            |
| 15 维算术平均     | **2.9/5**（仅作参考）                                              |
| 发布判定          | **Not Ready**                                                      |
| 最高严重度        | **High**                                                           |
| Finding 数量      | Blocker **0** / High **1** / Medium **6** / Low **4** / Info **0** |
| CI 对齐固定命令   | Pass **14** / Fail **1** / Blocked **6** / Skipped **1**           |

`Inspected`：High finding 同时涵盖两个生产传递依赖 advisory；数量按同一“锁文件存在未修复 High 且强制门禁失败”的根因计为一条，不把两个 advisory 重复计数。

### 2.2 前五项最高风险

1. **GNL-AUD-001（High）**：`pnpm run audit:prod` 失败；`socket.io-parser@4.2.6` 与 `brace-expansion@5.0.8` 各命中一个 High advisory，CI 发布门禁无法通过。
2. **GNL-AUD-002（Medium）**：SIGTERM 直接进入 `app.close()`；Nest 先销毁 provider、后关闭 HTTP adapter，没有先置 unready、摘流和 drain；5 秒 CI 关闭预算还短于应用 10 秒 deadline，Sentry 也未显式 flush。
3. **GNL-AUD-004（Medium）**：生产排除 `DemosModule`，但生产 migration 仍创建 `demo` 表，common OpenAPI 又硬编码 Demo CSRF token 路由；“可整体移除”的边界不闭合。
4. **GNL-AUD-005（Medium）**：开发 Session 示例把客户端自报的 `userId/displayName/role=admin` 写成 `authenticated: true`，文档未明确它只是未受信任状态模拟。
5. **GNL-AUD-006（Medium）**：production-oriented 定位缺少从 fresh clone、数据库/Redis、迁移与备份恢复、队列持久性、密钥轮换到滚动关停的连续运维契约。

### 2.3 三类完成度判断

- **声明完成度：部分完成。** `Inspected/Executed`：README 声明的 27 项平台/示例能力均能在实现、装配、配置、测试或文档中找到证据；没有“文件名存在但实现为空”的能力。6 项判为 Complete、6 项 Partial、15 项 Demo Only。Partial 主要来自真实外部集成未获授权、CSRF/OpenAPI 的 Demo 耦合、健康诊断和 Sentry 关闭缺口。
- **示例完成度：较高但有重要教学边界缺陷。** `Executed/Inspected`：743 个 unit/component tests 与 29 个 slice e2e 全部通过，Demo 路由、DTO 和专题文档大体一致；Session 的伪认证语义、auth 入口组合测试、Demo 数据库/CSRF 的移除边界仍可能误导复制者。
- **生产完成度：不足。** `Executed`：构建与制品可交付，但生产依赖强制门禁失败；Docker、真实 migration/full-app/production-entry 本轮均未获执行条件。`Inspected`：生产关闭、运维连续性和健康诊断仍有 Medium 缺口。

### 2.4 可用性结论

- **模板可学习：是，但需先修正 GNL-AUD-004/005/007 的教学契约。**
- **本地可验证：核心静态、unit、slice e2e 和构建路径已实际验证；真实 MySQL/Redis/Docker 路径本轮不可验证。**
- **生产可部署：否。** 最小发布阻断集合首先是 GNL-AUD-001；即使依赖门禁修复，也应在可丢弃基础设施上执行被阻塞的五项深度命令，并处理 GNL-AUD-002/003/006。

关键盲区是 Docker 镜像、真实 migration round-trip、真实 Redis/BullMQ 故障恢复、完整 `AppModule`、编译 production entry、多实例和真实 Sentry flush。它们已限制相关维度最高分，不被写成“应当没问题”。

## 3. 环境与验证命令矩阵

### 3.1 CI 对齐固定矩阵

| 命令                                   | 状态    | 退出码 |    耗时 | 失败类型                 | 证据摘要                                                           |
| -------------------------------------- | ------- | -----: | ------: | ------------------------ | ------------------------------------------------------------------ |
| `node --version`                       | Pass    |      0 |   <0.1s | —                        | `v24.19.0`                                                         |
| `pnpm --version`                       | Pass    |      0 |   <0.1s | —                        | `11.1.2`                                                           |
| `pnpm install --frozen-lockfile`       | Skipped |      — |       — | —                        | `node_modules` 已存在，Node/pnpm/lockfile 状态匹配；默认条件不成立 |
| `pnpm run verify:container-references` | Pass    |      0 |  0.236s | —                        | 验证 5 个 immutable container references                           |
| `pnpm run peers:check`                 | Pass    |      0 |  0.453s | —                        | peer compatibility 通过                                            |
| `pnpm run format:check`                | Pass    |      0 |  2.836s | —                        | 权威全量非写入 Prettier 门禁通过                                   |
| `pnpm run lint:check`                  | Pass    |      0 | 10.553s | —                        | ESLint 非修复门禁通过                                              |
| `pnpm run typecheck`                   | Pass    |      0 |  5.150s | —                        | production + test 两套 TypeScript 边界通过                         |
| `pnpm run test:cov`                    | Pass    |      0 | 12.804s | —                        | 101 suites / 743 tests；四项全局阈值均通过                         |
| `pnpm run test:integration-policy`     | Pass    |      0 |  0.343s | —                        | 4 个 Node policy tests 通过；仅证明破坏性 wrapper fail-closed      |
| `pnpm run build`                       | Pass    |      0 |  3.086s | —                        | TSC 0 error；SWC 编译 264 files                                    |
| `pnpm run verify:artifact`             | Pass    |      0 |  0.412s | —                        | 生产必需文件存在，未发现 spec/map/e2e 泄漏                         |
| `pnpm run verify:openapi`              | Pass    |      0 |  1.240s | —                        | 编译 controller 合成 OpenAPI 契约通过；不证明真实模块图            |
| `pnpm run compodoc`                    | Pass    |      0 |  3.467s | —                        | 代码结构文档生成通过                                               |
| `docker compose config --quiet`        | Blocked |    127 |   <0.1s | Environment              | `docker: command not found`；不是配置代码失败                      |
| `docker build --tag gnester-lite:ci .` | Blocked |      — |       — | Environment / Permission | Docker 缺失且默认 image build/run 为 DENY                          |
| `pnpm run verify:docker-image`         | Blocked |      — |       — | Environment / Permission | 没有获准构建的镜像与 Docker CLI                                    |
| `pnpm run test:e2e`                    | Pass    |      0 |  3.084s | —                        | 7 suites / 29 tests 通过                                           |
| `pnpm run verify:migrations`           | Blocked |      — |       — | Environment / Permission | 无可丢弃 MySQL 授权，3306 无监听                                   |
| `pnpm run test:full-app`               | Blocked |      — |       — | Environment / Permission | 无可丢弃 MySQL/Redis 双重安全门授权                                |
| `pnpm run verify:production-start`     | Blocked |      — |       — | Environment / Permission | 依赖真实 MySQL/Redis；未获执行授权                                 |
| `pnpm run audit:prod`                  | Fail    |      1 |  0.922s | Code / Supply Chain      | 2 High：`socket.io-parser`、`brace-expansion`                      |

固定矩阵统计：Pass 14、Fail 1、Blocked 6、Skipped 1。只有 `audit:prod` 是项目门禁失败；Docker/集成项均为环境或授权阻塞。

### 3.2 追加定向验证与调用纠正

| 命令/探针                                               | 状态    | 退出码 |       耗时 | 失败类型            | 证据摘要                                                                   |
| ------------------------------------------------------- | ------- | -----: | ---------: | ------------------- | -------------------------------------------------------------------------- |
| 编译后 TypeORM data source 只加载探针                   | Pass    |      0 |     0.186s | —                   | test 环境可加载；1 entity glob、1 migration glob                           |
| 可靠性定向 Jest（23 suites）                            | Pass    |      0 |     3.355s | —                   | 173 tests；cache/queue/schedule/health/upload/SSE/WS/DB/shutdown           |
| 文档契约定向 Jest（5 suites）                           | Pass    |      0 |     3.101s | —                   | 93 tests；OpenAPI/AsyncAPI/config/environment contracts                    |
| auth 真实 bootstrap 短生命周期探针                      | Pass    |      0 | 未单独计时 | —                   | 缺 password→401；短错误 password→401；合法凭据附加字段→400                 |
| 同一 auth 探针首次沙箱绑定                              | Blocked |      — | 未单独计时 | Environment         | `listen EPERM`；获准后原样重试通过，不计项目失败                           |
| 并发更新后 `pnpm run format:check` 复核                 | Pass    |      0 |    11.851s | —                   | 当前全部源码、测试、配置和文档仍满足 Prettier                              |
| 并发更新后 `pnpm run lint:check` 复核                   | Pass    |      0 |    11.717s | —                   | 当前 TypeScript lint 仍通过                                                |
| 并发更新后 `pnpm run typecheck` 复核                    | Pass    |      0 |     8.327s | —                   | 当前 production + test TypeScript 仍通过                                   |
| 并发更新路径定向 Jest（2 suites）                       | Pass    |      0 |     2.505s | —                   | health controller + demo Sentry controller，5 tests 通过                   |
| `pnpm audit --prod --json` 复核                         | Fail    |      1 |     1.018s | Code / Supply Chain | 重现相同 2 High；确认均为 production dependency path                       |
| `pnpm why --prod socket.io-parser`                      | Pass    |      0 | 未单独计时 | —                   | 解析到 `socket.io@4.8.3 → socket.io-parser@4.2.6`                          |
| `pnpm why --prod brace-expansion`                       | Pass    |      0 | 未单独计时 | —                   | 解析到 `typeorm → glob → minimatch → brace-expansion@5.0.8`                |
| `pnpm licenses list --prod`                             | Blocked |      1 |     0.660s | Environment         | 本地 package index 缺失；不能得出许可证无问题                              |
| `pnpm list --prod --depth 0`                            | Blocked |      1 |     0.675s | Environment         | pnpm store/package-index SQLite 无法打开                                   |
| `require.resolve('socket.io-parser/package.json')` 诊断 | Fail    |      1 | 未单独计时 | Tool invocation     | pnpm 非 hoist 导致调用方式错误；改用 `pnpm why` 和已安装实际路径后成功核对 |

`Inspected`：构建后 `dist/` 共 265 个文件，存在 `dist/src/main.js`、`dist/config/config.yaml`、`dist/config/typeorm.data-source.js`、Demo entity/migration 和 `dist/src/metadata.js`；未发现 source map、编译 spec 或 e2e artifact。runtime/CLI glob 与实际 `dist` 布局一致。

## 4. 十五维度评分卡

| 维度                          | 分数 | 最高严重度 | 证据摘要                                                          | 主要扣分原因                                                                |
| ----------------------------- | ---: | ---------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| D1 模板能力完成度             |    3 | Medium     | 27 项能力均有实现/装配证据；101/743 与 7/29 通过                  | Demo migration/CSRF/removal 边界未闭合（GNL-AUD-004）                       |
| D2 功能正确性与错误处理       |    3 | Medium     | unit/e2e、定向可靠性 173 tests 均通过                             | 关闭期间缺少先摘流再 drain（GNL-AUD-002）                                   |
| D3 认证与授权                 |    3 | Medium     | JWT/手写 guard、角色/权限/策略有单测与 HTTP 断言                  | Session 伪认证教学语义与 auth 组合 e2e 缺口（005/007）                      |
| D4 HTTP 与会话安全            |    3 | Medium     | CSRF/CORS/session/rate-limit e2e；生产秘密 fail-closed            | Session 将客户端角色标记为 authenticated；登录 400/401/429 未形成同入口回归 |
| D5 输入、网络、文件与秘密安全 |    2 | High       | DTO/upload/SSRF/secret/redaction 路径覆盖较强                     | 2 个 High 生产传递依赖 advisory（GNL-AUD-001）                              |
| D6 架构与依赖边界             |    3 | Medium     | 无 common→features、无跨 feature import、无 runtime cycle         | 生产 Demo schema/common OpenAPI 耦合；两个局部 transport/type 边界 Low      |
| D7 类型、清晰度与可维护性     |    4 | Low        | strict typecheck/lint 通过；无显式 `any`、suppression、TODO/FIXME | WebSocket type-level cycles 与局部 Express/Multer service 耦合（009/010）   |
| D8 配置正确性                 |    3 | Medium     | 48/48 env template；YAML/env/type/use 对齐；构建配置可加载        | 真实 production dependency bootstrap 未获验证，关键路径最高 3               |
| D9 数据库与迁移               |    3 | Medium     | entity/migration/glob/Compose 顺序静态一致；migration spec 通过   | 生产仍创建 Demo 表；真实 up/down/up 与恢复流程未验证/未文档化               |
| D10 异步与集成可靠性          |    3 | Medium     | cache/queue/schedule/upload/SSE/WS/HTTP 定向 tests 通过           | shutdown drain、Redis durability/replay 和真实故障注入缺口                  |
| D11 测试覆盖与质量            |    3 | Medium     | 84.77/49.07/93.35/87.12；无 skip/only/未 await matcher            | auth 安全入口没有真实 bootstrap 的 400/401/429 组合回归（GNL-AUD-007）      |
| D12 API 与文档契约            |    3 | Medium     | 路由 AST、链接、OpenAPI/AsyncAPI 契约检查通过                     | Demo removability、Session/auth 语义及生产运维说明不完整                    |
| D13 可观测性与健康检查        |    3 | Medium     | Pino/Sentry privacy、DB/Redis readiness 均有测试                  | 探针失败无安全内部诊断；关闭无 Sentry flush；真实外部 sink 未验证           |
| D14 构建、交付与仓库卫生      |    2 | High       | format/lint/type/build/artifact/OpenAPI/Compodoc 通过             | 强制 dependency audit 门禁失败；Docker image 路径被阻塞                     |
| D15 开发者体验与生产就绪度    |    2 | High       | Quick Start、Compose、主题文档和安全门已具基础                    | High 发布阻断 + 运维连续性 Medium + 关键生产路径未验证                      |

算术平均：`43 / 15 = 2.866…`，四舍五入 **2.9/5**。由于存在确认 High，规则将 Overall readiness 封顶为 **2/5**，不能用平均分覆盖 `Not Ready`。

## 5. 全量能力矩阵

| 能力                                     | common/bootstrap               | demo/consumer                           | module wiring                            | config                                           | unit tests                                       | e2e                                   | docs                         | runtime dependency               | 状态      | 证据                                                           |
| ---------------------------------------- | ------------------------------ | --------------------------------------- | ---------------------------------------- | ------------------------------------------------ | ------------------------------------------------ | ------------------------------------- | ---------------------------- | -------------------------------- | --------- | -------------------------------------------------------------- |
| auth：Local/JWT、密码哈希、token         | `common/auth`                  | `demo-auth`、WS                         | feature 按需导入；production 无 Demo     | `JWT_*`、TTL/issuer/audience                     | token/hash/guard/strategy/service/controller     | app slice；full-app 本轮 Blocked      | security/demo/OpenAPI        | Node crypto                      | Demo Only | `src/common/auth/**`；`src/examples/demo-auth/**`；GNL-AUD-007 |
| authorization：role/permission/policy    | `common/authorization`         | `demo-authorization`                    | feature 导入 auth + authorization        | JWT claims                                       | 三类 guard/decorator/controller                  | app slice 401/403/200 部分组合        | security/project notes       | auth identity                    | Demo Only | authorization specs；`test/app.e2e-spec.ts`                    |
| cache：Redis cache、HTTP cache           | `common/cache`（global）       | `demo-cache`；health ping               | AppModule 常驻                           | YAML TTL/capacity、`REDIS_URL`                   | connection/service/interceptor                   | full-app 本轮 Blocked                 | cache/README                 | Redis                            | Partial   | cache tests 通过；真实 Redis 未获执行                          |
| configuration：YAML/env 双验证           | ConfigModule、`config/**`      | `demo-config`                           | AppModule global                         | 48 env keys + YAML typed defaults                | configuration/validation/template contract       | config demo slice/contract            | README/config/project notes  | 文件/env                         | Complete  | 48/48 env 对照；typecheck/build 通过                           |
| cookies：签名/读写/删除                  | cookie-parser bootstrap        | `demo-cookies`                          | DemosModule                              | cookie secret/options                            | controller/service/bootstrap specs               | cookies e2e                           | demo/security                | HTTP cookie                      | Demo Only | `test/cookies.e2e-spec.ts`                                     |
| cors：HTTP/Socket.IO 同源策略            | bootstrap + Socket.IO adapter  | `demo-cors`                             | `configureApplication`                   | `CORS_*` 严格生产校验                            | config/bootstrap/adapter                         | CORS 行为由 bootstrap/相关 slices     | README/security/demo         | proxy/browser                    | Complete  | `src/bootstrap/configure-application.ts`；validation specs     |
| crypto：random/HMAC/encryption           | `common/crypto`                | `demo-crypto`                           | feature 按需导入                         | `ENCRYPTION_KEY`、`HMAC_SECRET`                  | service vectors/error paths                      | 无独立 e2e                            | security/demo                | Node crypto/key lifecycle        | Demo Only | crypto specs；GNL-AUD-006 涉及 rotation 文档                   |
| csrf：double-submit 防护/token           | `common/csrf` + bootstrap      | `demo-csrf` token/preview               | AppModule 常驻；token endpoint 仅 Demo   | `CSRF_*`                                         | service/middleware/OpenAPI                       | CSRF e2e 调真实 bootstrap             | README/security/demo/OpenAPI | cookie/session-like client state | Partial   | `test/csrf.e2e-spec.ts`；GNL-AUD-004                           |
| database：TypeORM/MySQL/migration        | TypeORM config + migrations    | `demo-database`                         | AppModule 常驻；feature entity           | `DB_*`、sync prod=false                          | service/entity/migration/config                  | full-app/migration 本轮 Blocked       | database/demo/README         | MySQL 8                          | Partial   | build/glob 通过；GNL-AUD-004/006                               |
| events：EventEmitter 与审计记录          | root EventEmitter              | `demo-events`                           | AppModule root + feature                 | max listeners/wildcard                           | service + real listener behavior                 | 无独立 HTTP e2e                       | events/demo                  | 进程内内存                       | Demo Only | events specs；边界/eviction 断言通过                           |
| health：live/DB/Redis ready              | `common/health`                | Compose/CI/orchestrator consumer        | AppModule 常驻                           | DB/Redis timeout                                 | controller + indicators                          | full-app/prod-start 本轮 Blocked      | health/README                | MySQL + Redis                    | Partial   | readiness tests；GNL-AUD-003                                   |
| http-client：outbound Axios policy       | `common/http-client`           | `demo-http`                             | global module + feature                  | timeout/redirect/body/URL policy                 | factory/service/DTO/error map                    | 无真实网络 e2e                        | http-client/demo             | 外网/目标 API                    | Demo Only | HTTP 定向 tests 通过                                           |
| logger：Pino、redaction、request context | `common/logger` + bootstrap    | 全局使用                                | AppModule + `app.useLogger`              | level/pretty/redaction                           | config/serializer/filter                         | 由 app/bootstrap 行为间接覆盖         | logger/README                | stdout/log sink                  | Complete  | lint 禁止 console；privacy tests                               |
| openapi：development HTTP contract       | `common/openapi` + bootstrap   | 全部编译 HTTP controllers               | development only                         | app metadata/CSRF header                         | config/error-contract                            | compiled verifier Pass                | openapi/README               | 无；UI assets                    | Partial   | `verify:openapi` Pass；GNL-AUD-004/008                         |
| asyncapi：Socket.IO 事件契约             | feature service/controller     | `demo-websocket`                        | DemosModule；production 排除             | host/server metadata                             | parser/service/controller-equivalent             | websocket e2e                         | asyncapi/demo                | 无                               | Demo Only | AsyncAPI 3 parser tests 通过                                   |
| queue：BullMQ producer/worker/flow       | `common/queue`（global）       | `demo-queue`                            | test 排除 worker；provision 启用         | enabled/concurrency/retry/capacity               | connection/service/processor                     | full-app 本轮 Blocked                 | queue/demo                   | Redis/BullMQ                     | Demo Only | 定向 queue tests 通过；真实恢复未验证                          |
| rate-limit：named budgets                | `common/rate-limit` APP_GUARD  | auth + demo-rate-limit                  | AppModule 常驻                           | YAML named throttlers/proxy                      | module/decorator/controller                      | rate-limit e2e                        | security/rate-limit/demo     | 进程内 storage 默认              | Complete  | `test/rate-limit.e2e-spec.ts`；GNL-AUD-007                     |
| schedule：静态/动态 jobs、drain          | `common/schedule`              | `demo-schedule`                         | AppModule 常驻，默认 disabled            | enabled/timezone                                 | overlap/rejection/cleanup/shutdown               | 无真实时钟 e2e                        | schedule/demo                | timers/clock                     | Demo Only | schedule specs 通过；多实例待验证                              |
| security/helmet：headers/proxy policy    | bootstrap/common security      | `demo-security`                         | `configureApplication`                   | trust proxy/CORS/cookie                          | config/service/header assertions                 | 相关 HTTP slices                      | security/demo                | reverse proxy/TLS                | Complete  | 生产约束 fail-closed；真实 proxy 未验证                        |
| sentry：HTTP/后台错误与 privacy          | `instrument.ts` + SentryModule | `demo-sentry`、queue/schedule/events/WS | AppModule 常驻；test/provision skip init | DSN/enabled/rate/environment                     | privacy/background isolation                     | 无外部 transport e2e                  | sentry/security              | Sentry network                   | Partial   | privacy envelope test；GNL-AUD-002                             |
| serialization：class serializer          | interceptor/DTO patterns       | `demo-serialization`                    | feature                                  | 无独立键                                         | entity/DTO/service/controller                    | 无独立 e2e                            | serialization/demo           | 无                               | Demo Only | serialization tests；未泄漏敏感字段                            |
| session：Express session lifecycle       | bootstrap session config       | `demo-session`                          | session optional + feature               | enabled/secret/cookie/TTL；prod MemoryStore 拒绝 | service/limits/rotation                          | session e2e 真 bootstrap              | security/demo                | session store（dev memory）      | Demo Only | 轮换/容量通过；GNL-AUD-005                                     |
| sse：有限事件流/断连                     | Nest SSE adapter               | `demo-sse`                              | feature                                  | 固定示例预算                                     | service completion/cleanup                       | SSE headers/stream e2e                | demo                         | HTTP long connection             | Demo Only | SSE specs + e2e 通过                                           |
| streaming-files：受控文件流              | Nest/Express stream            | `demo-streaming-files`                  | feature                                  | allowlist/static asset                           | service/controller                               | 无独立 e2e                            | demo                         | 本地文件系统                     | Demo Only | range/error/allowlist tests                                    |
| upload：multipart/chunked/cleanup        | Multer/bootstrap boundary      | `demo-upload`                           | feature                                  | size/count/quota/TTL                             | service/storage/controller                       | 无独立 HTTP e2e                       | upload/demo                  | 临时磁盘                         | Demo Only | 并发 finalize/cleanup tests；GNL-AUD-010                       |
| validation：全局 DTO 边界                | `ValidationPipe` bootstrap     | 所有 DTO                                | `configureApplication`                   | whitelist/forbid/transform                       | pipe/DTO/config                                  | CSRF/session/rate slices 真 bootstrap | validation/README            | 无                               | Complete  | typecheck + validation behavior tests                          |
| websocket：Socket.IO adapter/auth/rooms  | common adapter                 | `demo-websocket`                        | bootstrap adapter + feature gateway      | CORS/JWT/payload limits                          | adapter/guard/filter/interceptor/gateway/service | websocket e2e                         | asyncapi/demo/security       | Socket.IO                        | Demo Only | WS e2e 通过；GNL-AUD-009                                       |

状态汇总：**Complete 6 / Partial 6 / Demo Only 15 / Missing 0 / Blocked 0 / Not Applicable 0**。`Blocked 0` 指不存在整项能力完全无法审计；Partial 行仍明确记录了真实基础设施动态验证被阻塞。该汇总不是“项目完成度百分比”，不使用文件数或主观权重配分。

## 6. 详细 Findings

### 6.1 Blocker

无。

### 6.2 High

#### GNL-AUD-001 — 两个 High 生产传递依赖漏洞使强制发布门禁失败

- **ID:** GNL-AUD-001
- **标题:** 两个 High 生产传递依赖漏洞使强制发布门禁失败
- **类型:** Supply Chain
- **维度:** D5、D14、D15
- **严重度:** High
- **置信度:** Confirmed
- **证据类型:** Executed + Inspected
- **位置:** `pnpm run audit:prod`；`package.json:31,91-92`；`.github/workflows/ci.yml:133-134`；`pnpm-lock.yaml:3690-3695,7947-7952,12588-12595,13592-13595,14316-14324,14699-14710`
- **现象:** `Executed`：生产审计两次稳定返回 exit 1，并报告 `socket.io-parser@4.2.6` 的 [GHSA-2m8v-j782-fhvr](https://github.com/advisories/GHSA-2m8v-j782-fhvr)（受影响 `<4.2.7`）以及 `brace-expansion@5.0.8` 的 [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895)（受影响 `<5.0.9`），均为 High。前者路径为 `socket.io@4.8.3 → socket.io-parser`，后者为 `typeorm@0.3.31 → glob@10.5.0 → minimatch@9.0.7 → brace-expansion`。
- **预期或判定依据:** 仓库把 `pnpm run audit:prod` 放在强制 CI 尾门禁；一次可发布状态必须让该门禁通过，或有经过维护者批准、说明可达性与期限的例外策略。两个上游范围均允许已修复 patch。
- **影响:** 适用环境是任何按当前 lockfile 安装生产依赖的 CI/构建。确定影响是发布门禁失败，完整调用链为 `CI → pnpm audit --prod → pnpm-lock production paths → exit 1`。当前 production 模块图排除 Demo gateway，因此 `socket.io-parser` 的现有公开 WebSocket 可达面有限；TypeORM glob 使用常量 pattern，`brace-expansion` 输入也不是当前攻击者可控。故本 finding 的 High 依据是**确认的生产发布阻断**，不声称已证明当前默认生产路由可被远程利用。
- **根因:** 锁文件仍解析到 advisory 公布后已被修复的传递 patch 版本，依赖更新门禁未及时把安全 patch 收敛进 lockfile。
- **复现/验证方法:** 在当前工作区执行 `pnpm run audit:prod` 或 `pnpm audit --prod --json`；再以 `pnpm why --prod socket.io-parser` 和 `pnpm why --prod brace-expansion` 核对 production path。
- **最小修复建议:** 在不改变公共 API 的前提下刷新 lockfile，使 `socket.io-parser >=4.2.7`、`brace-expansion >=5.0.9`；当前父依赖范围分别为 `~4.2.4` 与 `^5.0.2`，优先尝试最小 lockfile patch 更新，避免不必要的主版本升级。
- **建议补充测试:** frozen install 后运行完整 CI；重新执行 `audit:prod`、`peers:check`、unit/e2e/build；保留 `pnpm why --prod` 证据，确认没有另一条旧版本路径。
- **相关 finding:** GNL-AUD-011 会影响生产门禁失败时的诊断，但不是本漏洞根因。

### 6.3 Medium

#### GNL-AUD-002 — 关闭流程未先摘除 readiness 并 drain，且观测刷新不在统一期限内

- **ID:** GNL-AUD-002
- **标题:** 关闭流程未先摘除 readiness 并 drain，且观测刷新不在统一期限内
- **类型:** Reliability / Operational Gap
- **维度:** D2、D10、D13、D15
- **严重度:** Medium
- **置信度:** Confirmed（Sentry 最后一批 envelope 丢失影响为 Probable）
- **证据类型:** Inspected + installed-runtime trace
- **位置:** `src/main.ts:20-37,50-64`；`src/bootstrap/application-shutdown.ts:1,44-66,75-124`；`src/common/health/health.controller.ts:52-65`；`scripts/verify-production-start.mjs:4-5,25-54`；`docker-compose.yml:1-35`；已安装 `@nestjs/core/nest-application-context.js:126-132`；`src/instrument.ts:19-26`
- **现象:** SIGINT/SIGTERM 直接调用 `app.close()`，应用没有 draining 状态，也没有先让 `/health/ready` 失败并等待负载均衡传播。当前 Nest `close()` 顺序是 destroy hooks → before-shutdown hooks → HTTP adapter dispose → shutdown hooks，因此 provider/连接可先被销毁，而 HTTP adapter 尚未停止接收。最终固定 `process.exit()`；应用关闭 deadline 为 10 秒，但 production-start verifier 只等 5 秒。Sentry 在进程早期初始化，运行时关闭路径却未显式 `flush/close`。
- **预期或判定依据:** 滚动关闭应先变为 unready、等待摘流、停止接受新工作，再在有界预算内 drain HTTP/WS/SSE/worker/provider 和 telemetry；外部 stop grace 应明显大于内部总预算。
- **影响:** 适用环境是收到 SIGTERM/SIGINT 的生产实例。调用链为 `signal listener → closeApplicationWithinDeadline → Nest app.close → provider destroy → HTTP adapter dispose → hard exit`。窗口内新请求可能落到已开始拆除依赖的实例；5 秒验证器可能在合法的 10 秒内部关闭尚未到期时强杀。启用 Sentry 时，启动失败/关闭窗口最后事件可能未发送。
- **根因:** 当前关闭控制器只把 `app.close()` 视为单阶段动作，没有显式 traffic/drain/telemetry phases，也没有统一配置外部与内部时间预算。
- **复现/验证方法:** 在可丢弃完整环境持续请求 `/health/ready` 和业务长请求，同时发送 SIGTERM；记录 readiness、HTTP 接受窗口、provider hooks、Sentry fake transport 和进程退出时间。静态顺序可由当前安装的 Nest runtime 直接复核。
- **最小修复建议:** 增加应用级 draining coordinator；信号到达立即使 readiness down，等待可配置传播时间，再关闭 admission、drain 各 transport/provider，最后在共享总预算内限时 `Sentry.flush/close`。把平台/Compose stop grace 与 verifier timeout 设为大于内部总预算并留余量。
- **建议补充测试:** 并发长请求 + readiness 时间线；provider close 前后不再接新请求；Sentry flush 成功/超时/禁用；重复信号幂等；verifier 等待预算与应用配置契约测试。
- **相关 finding:** GNL-AUD-003、GNL-AUD-006、GNL-AUD-011。

#### GNL-AUD-003 — 依赖 readiness 失败被公开脱敏后没有内部安全诊断

- **ID:** GNL-AUD-003
- **标题:** 依赖 readiness 失败被公开脱敏后没有内部安全诊断
- **类型:** Operational Gap
- **维度:** D13、D15
- **严重度:** Medium
- **置信度:** Confirmed
- **证据类型:** Inspected
- **位置:** `src/common/health/database-health.indicator.ts:15-30`；`src/common/health/redis-health.indicator.ts:18-41`；`src/common/logger/logger.config.ts:80-93,172-174`；对应 indicator specs
- **现象:** 数据库和 Redis indicator 捕获异常后只返回固定的公开 down 文本，没有记录安全的错误类别、超时标志或耗时；Pino 又明确跳过 `/health/live` 和 `/health/ready` 自动请求日志。公开响应不泄漏连接细节是正确的，但内部也没有对应诊断事件。
- **预期或判定依据:** 对外健康响应应脱敏；内部应有结构化、限频且不包含连接串/凭据的依赖故障证据，以支持告警关联和恢复定位。
- **影响:** 依赖故障时探针会正确变为失败，但应用日志中可能没有“数据库拒绝/Redis 超时”等最小安全上下文；生产事件只能从编排平台的 503 反推，延长定位时间。
- **根因:** 只实现了 public error sanitization 和 health access-log suppression，没有配套内部观测通道。
- **复现/验证方法:** 在可丢弃环境使 MySQL 或 Redis 不可达，调用 `/health/ready` 并同时采集应用日志；单测 mock 也可直接证明 catch 路径没有 Logger 调用。
- **最小修复建议:** 在 indicator 失败路径记录结构化 dependency、failure class、timeout、duration；严格移除 URL、用户名、密码和原始敏感文本，并加采样/去重避免探针风暴。
- **建议补充测试:** connection refused、timeout、正常恢复三类；断言安全字段存在且 secret sentinel 不出现；正常探针不产生日志噪声。
- **相关 finding:** GNL-AUD-002；未受应用限流的 readiness 容量风险列在 Needs Verification。

#### GNL-AUD-004 — “生产排除且可整体移除 Demo”未覆盖 schema 与 common 契约

- **ID:** GNL-AUD-004
- **标题:** “生产排除且可整体移除 Demo”未覆盖 schema 与 common 契约
- **类型:** Architecture / Documentation Mismatch
- **维度:** D1、D6、D9、D12、D15
- **严重度:** Medium
- **置信度:** Confirmed
- **证据类型:** Inspected + artifact trace
- **位置:** `docs/demo.md:7-18`；`src/app.module.ts:21-30`；`src/common/openapi/openapi.config.ts:76-85`；`src/examples/demo-csrf/demo-csrf.controller.ts:20-35`；`config/database.config.ts:4-8,100-101,117-130`；`src/migrations/1760000000000-CreateDemoTable.ts:3-15`；`docker-compose.yml:30-56`；`scripts/verify-build-artifact.mjs:6-11`
- **现象:** production module graph 确实排除 `DemosModule`，但 compiled migration glob 会执行 `CreateDemoTable`，Compose 的 one-shot migrate 也会在 production 创建 `demo` 表；制品 verifier 要求该 migration 存在。同时 common OpenAPI 对所有 unsafe operation 写入“从 `GET /demo-csrf/token` 获取 token”的说明，而该 endpoint 仅属于可移除 Demo。现行文档没有完整 Demo removal checklist。
- **预期或判定依据:** “production 无 demo route/worker”可以只描述运行模块边界；但“`src/features` 可整体移除”还应覆盖迁移/schema、平台契约、校验脚本和文档残留，或明确列出保留项。
- **影响:** 默认 production schema 出现未被生产模块消费的示例表；移除 feature 后 common OpenAPI 仍引用已不存在的 token route；模板使用者难以判断哪些跨层资产必须一并删除。
- **根因:** 环境过滤只应用于 Nest module imports，没有把 feature ownership 扩展到 migration、artifact contract 和 common 文案。
- **复现/验证方法:** 构建后检查 `dist/src/migrations` 与 OpenAPI contract；在获准的空白 MySQL 上执行 compiled migration 并查询 schema。数据库执行本轮被阻塞，但 SQL、glob 和 Compose 调用链已闭合。
- **最小修复建议:** 由维护者明确二选一：真正 opt-in Demo（schema/migration/verifier/common 文案一并解耦），或把 Demo schema 定义为正式模板资产并停止“整体移除”表述。CSRF token 获取地址应为可配置/feature-neutral 契约；补一份 removal checklist。
- **建议补充测试:** production module graph + artifact + migrated schema 联合断言；无 Demo fixture 能构建且 OpenAPI 不含 `/demo-*` 引用。
- **相关 finding:** GNL-AUD-006、GNL-AUD-008。

#### GNL-AUD-005 — Session 示例把客户端自报身份标记为 authenticated

- **ID:** GNL-AUD-005
- **标题:** Session 示例把客户端自报身份标记为 authenticated
- **类型:** Documentation Mismatch
- **维度:** D3、D4、D12、D15
- **严重度:** Medium
- **置信度:** Confirmed
- **证据类型:** Inspected + Executed e2e contract
- **位置:** `src/examples/demo-session/dto/create-demo-session-login.dto.ts:16-43`；`src/examples/demo-session/demo-session.controller.ts:77-89`；`src/examples/demo-session/demo-session.service.ts:42-49,93-115,344-356`；`src/examples/demo-session/dto/demo-session-state.dto.ts:41-46`；`test/session.e2e-spec.ts:180-204`；`docs/demo.md:883-918`
- **现象:** 公开的 development route 接受客户端提供的 `userId`、`displayName` 和包含 `admin` 的 role，未经 auth guard/credential 验证直接写入 session，随后返回 `authenticated: true`。文档把它称为 login/authenticated user state，却没有在该示例处明确说明这些字段是不可信模拟数据、不可用于授权。
- **预期或判定依据:** Session 教学可以演示 fixation-safe ID rotation，但“已认证身份/管理员角色”必须来自已验证的 auth principal；若只演示 session mutation，应使用 `simulated`/`untrusted` 语义并显著警示。
- **影响:** 适用条件是非 production、`SESSION_ENABLED=true`。调用链为 `POST /demo-session/login → body DTO → DemoSessionService.login → req.session.demoSession.user → authenticated response`。当前 production 排除 Demo，因此没有确认的生产提权；风险是使用者复制示例后把客户端 role 当成授权依据。
- **根因:** 为集中演示 session rotation，把认证动作简化为 body mutation，但响应命名和文档没有保留信任边界。
- **复现/验证方法:** 按 `test/session.e2e-spec.ts` 发送 `role: admin`，无需 bearer token 或真实 credential 即得到 `authenticated: true` 与 admin user。
- **最小修复建议:** 优先复用 `LocalAuthGuard`/JWT/OAuth callback 的已验证 principal 再写 session；若不想把 auth 引入 Session demo，则重命名为 simulated profile，移除 authenticated/admin 授权暗示并加醒目警告。
- **建议补充测试:** 未认证 body 不能建立 trusted identity；已验证 principal 与 session identity 绑定；role 不从客户端直接采纳；文档示例断言信任来源。
- **相关 finding:** GNL-AUD-007。

#### GNL-AUD-006 — production-oriented 文档没有形成完整运维生命周期

- **ID:** GNL-AUD-006
- **标题:** production-oriented 文档没有形成完整运维生命周期
- **类型:** Documentation Mismatch / Operational Gap
- **维度:** D9、D10、D12、D13、D15
- **严重度:** Medium
- **置信度:** Confirmed（具体生产事故场景为 Needs Verification）
- **证据类型:** Inspected + exhaustive current-doc search
- **位置:** `README.md:3-23,83-128,163-178,183-189`；`docs/database.md:69-105`；`docs/cache.md:45-64`；`docs/queue.md:9-28,103-127`；`docs/security.md:17-52`；`docs/health.md:54-69`；`docs/sentry.md`；`docker-compose.yml:65-80`
- **现象:** Quick Start 列出 MySQL/Redis 后直接 migration/start，只提示调整 MySQL 凭据，没有启动服务、创建 database、验证 Redis 的可复制步骤；migration 文档没有 rolling expand/migrate/contract、长锁、失败恢复、backup/restore 和单一 migrator 所有权；cache 与 BullMQ 共用 `REDIS_URL`，却没有 persistence、eviction、cache/queue 隔离及 replay 契约；加密只有单一 key/v1 payload，没有旧 key/key ring/轮换恢复；也没有 preStop/readiness/drain/grace 和 Sentry flush 的统一指南。
- **预期或判定依据:** “production-oriented examples”不等于替部署平台包办所有运维，但至少应明确模板、平台与业务团队各自责任，并给出从 fresh clone、部署、迁移、运行、恢复到关闭的最低连续路径。
- **影响:** 新用户可能在 database 不存在或 Redis 未启动时卡住；生产使用者可能把允许丢失的 cache 策略用于 BullMQ keys、在新旧 schema 共存时直接 revert、替换 encryption key 后失去旧密文，或没有无损关停操作顺序。报告不声称这些事故已实际发生。
- **根因:** 文档按组件功能拆分，没有集中 operations/deployment contract；专题文档只覆盖单次 API/命令使用。
- **复现/验证方法:** 仅凭现行 README/docs 回答“如何从空白主机创建依赖、恢复数据库、选择 Redis 持久化、决定 migrator、轮换 key、重放 job、无损停止实例”，无法得到闭环。全量现行文档搜索未发现对应章节。
- **最小修复建议:** 新增 README 链接的 production operations 指南；明确 fresh-clone 两种依赖启动路径、DB 创建、备份/恢复演练、migration actor/rollout/rollback 边界、Redis queue 独立实例或非淘汰持久化要求、job 对账/replay、key version/key ring，以及 shutdown runbook。
- **建议补充测试:** disposable fresh-clone 文档 smoke；相邻 schema 共存；Redis restart/内存压力/queue recovery；旧 key 读新 key 写与重加密；shutdown timeline 演练。
- **相关 finding:** GNL-AUD-002、GNL-AUD-004。

#### GNL-AUD-007 — 登录安全入口缺少真实 bootstrap 的 400/401/429 组合回归

- **ID:** GNL-AUD-007
- **标题:** 登录安全入口缺少真实 bootstrap 的 400/401/429 组合回归
- **类型:** Test Gap
- **维度:** D3、D4、D11、D12
- **严重度:** Medium
- **置信度:** Confirmed
- **证据类型:** Executed + Inspected
- **位置:** `test/app.e2e-spec.ts:29-46,104-132`；`test/full-app.integration-spec.ts:35-45,101-107`；`src/examples/demo-auth/demo-auth.controller.ts:50-68`；`src/examples/demo-auth/dto/sign-in.dto.ts:7-18`；`src/examples/demo-auth/demo-auth.controller.spec.ts:82-92`；`test/rate-limit.e2e-spec.ts:68-160`
- **现象:** auth slice 直接 `createNestApplication().init()`，未调用 `configureApplication()`、未装配 `CommonRateLimitModule`，且只测成功登录；full-app 也只发一次合法登录。DTO、LocalStrategy、throttle metadata 和另一条 rate-limit demo 分开有测试，但没有在同一真实入口验证 400/401/429。短生命周期真实 bootstrap 探针确认：缺 password 和短错误 password 均在 guard 阶段返回 401，合法 credential 带未知字段才进入全局 pipe 返回 400。
- **预期或判定依据:** credential endpoint 公布 400/401/429 后，应由同入口、真实 middleware/guard/pipe/APP_GUARD 顺序的 HTTP 测试固化边界；否则 synthetic OpenAPI 和分散单测不能证明状态可达。
- **影响:** LocalAuthGuard、ValidationPipe、throttler 装配或 lifecycle 顺序改变时，现有 CI 可能仍绿；当前“何种 invalid payload 是 400、何种被折叠为 401”也没有被明确决策和回归保护。
- **根因:** 为避免外部依赖，auth e2e 采用过窄 TestingModule；安全组件分别验证但缺少组合 contract test。
- **复现/验证方法:** 构造 `DemoAuthModule + CommonCsrfModule + CommonRateLimitModule` 的短生命周期 TestingModule，调用真实 `configureApplication()`，发送缺字段、错误/超长 credential、未知字段与连续错误登录。
- **最小修复建议:** 增加不依赖 MySQL/Redis、但复用真实 bootstrap 的 auth slice；由维护者明确 guard-before-pipe 下预期 400/401 语义，并同步 OpenAPI 描述。
- **建议补充测试:** malformed/unknown/oversized input；错误 credential 401；同客户端第六次 429 与跨客户端隔离；净化错误体；CSRF 启用/禁用矩阵。
- **相关 finding:** GNL-AUD-005、GNL-AUD-008。

### 6.4 Low

#### GNL-AUD-008 — OpenAPI verifier 的合成应用不证明真实模块图与 URI versioning

- **ID:** GNL-AUD-008
- **标题:** OpenAPI verifier 的合成应用不证明真实模块图与 URI versioning
- **类型:** Test Gap
- **维度:** D11、D12
- **严重度:** Low
- **置信度:** Confirmed
- **证据类型:** Inspected
- **位置:** `scripts/verify-openapi-document.mjs:148-188,264-303`；`src/bootstrap/configure-application.ts:107-114`；`src/app.controller.ts:4-10`；`docs/openapi.md:22-30,50-55`
- **现象:** verifier 递归加载每个 compiled controller，mock constructor dependencies 后直接 `app.init()`；它不加载环境模块图，也不调用 `configureApplication()`/URI versioning。孤立 controller 仍可进入文档，root path 的 `/v1` 也未被该 gate 断言。
- **预期或判定依据:** controller-level schema gate 与 runtime module/reachability gate 应明确区分；至少应保护根 URI version contract。
- **影响:** `verify:openapi` 通过不能发现未装配 controller、环境可达性或 `/`/`/v1` 回归；当前代码/文档未发现实际路由错误，所以定为验证盲区而非功能 bug。
- **根因:** 为完全避开基础设施而使用 synthetic module，未补最小 bootstrap parity assertion。
- **复现/验证方法:** 比较 synthetic `document.paths` 与 development `/docs-json`，或人为放入未导入 controller 观察 verifier 仍会发现它。
- **最小修复建议:** synthetic app 启用相同 URI versioning并断言 `/v1`；另加 development module graph 的 docs-json smoke，文档注明两类 gate 的范围。
- **建议补充测试:** `/docs-json` 包含 `/v1` 且不含 `/`；未导入 controller 不进入 runtime document。
- **相关 finding:** GNL-AUD-004、GNL-AUD-007。

#### GNL-AUD-009 — Demo WebSocket socket 类型形成三条反向 type-only cycle

- **ID:** GNL-AUD-009
- **标题:** Demo WebSocket socket 类型形成三条反向 type-only cycle
- **类型:** Maintainability
- **维度:** D6、D7
- **严重度:** Low
- **置信度:** Confirmed
- **证据类型:** Inspected + import graph analysis
- **位置:** `src/examples/demo-websocket/demo-websocket.gateway.ts:32-42`；`demo-websocket-authenticated.guard.ts:4`；`demo-websocket-exception.filter.ts:10-11`；`demo-websocket-response.interceptor.ts:9-10`
- **现象:** gateway 导入 guard/filter/interceptor，而三者又从 gateway 导入 `DemoWebsocketSocket` 类型；TypeScript 擦除后没有 runtime cycle，但模块所有权方向反转。
- **预期或判定依据:** gateway 使用的共享 socket contract 应位于中立 types 文件，适配器不应反向依赖组合入口。
- **影响:** 当前无运行 bug；未来改成 value import、decorator metadata 或移动类型时容易演化为真实循环，增加重构认知成本。
- **根因:** socket type 就近声明在 gateway，而非 feature contract 文件。
- **复现/验证方法:** 静态 TypeScript import graph；runtime graph 扫描确认 cycle 仅 type-level。
- **最小修复建议:** 将 `DemoWebsocketSocket` 移到 `demo-websocket.types.ts`，由 gateway/guard/filter/interceptor单向导入。
- **建议补充测试:** 保留 import-boundary/cycle check；typecheck 和 websocket e2e。
- **相关 finding:** 无。

#### GNL-AUD-010 — 两个 Demo application service 直接暴露 Express/Multer transport 类型

- **ID:** GNL-AUD-010
- **标题:** 两个 Demo application service 直接暴露 Express/Multer transport 类型
- **类型:** Architecture / Maintainability
- **维度:** D6、D7
- **严重度:** Low
- **置信度:** Confirmed
- **证据类型:** Inspected
- **位置:** `src/examples/demo-session/demo-session.service.ts:7-8,26,93-115`；`src/examples/demo-session/demo-session.controller.ts:73-88`；`src/examples/demo-upload/demo-upload.service.ts:79-109,165-169,298-320`
- **现象:** Session service 的公开用例接收 Express `Request/Session` 并直接调用 session lifecycle；Upload service 的公开 API 接收 `Express.Multer.File`，同时承担协议字段映射和 upload workflow。它们均为 Demo feature 内部，不形成 common→feature 泄漏。
- **预期或判定依据:** Controller/adapter 应尽量把传输对象收敛成窄 application input；service 只在其职责明确就是 transport adapter 时依赖 Express/Multer。
- **影响:** 当前行为和测试均正确；复用到 Fastify、消息消费者或对象存储时需要携带 Express/Multer contracts，增加替换成本。
- **根因:** 示例为了集中展示 API，协议适配和用例编排放进同一 service。
- **复现/验证方法:** 查看 public signatures；尝试从非 HTTP consumer 调用时必须构造 Express/Multer 对象。
- **最小修复建议:** Session 将 regenerate/destroy 包装留在 adapter 或注入窄 session port；Upload controller 构造业务输入，workflow 只依赖受控文件 metadata/buffer/path port。保持 Demo 简洁，避免过度抽象。
- **建议补充测试:** 纯 application input 单测 + transport adapter contract；现有 session/upload e2e 回归。
- **相关 finding:** GNL-AUD-005。

#### GNL-AUD-011 — production-start 门禁丢弃应用 stdout/stderr

- **ID:** GNL-AUD-011
- **标题:** production-start 门禁丢弃应用 stdout/stderr
- **类型:** Test Gap / Operational Gap
- **维度:** D11、D13、D14
- **严重度:** Low
- **置信度:** Confirmed
- **证据类型:** Inspected
- **位置:** `scripts/verify-production-start.mjs:8-16,89-121`；`.github/workflows/ci.yml:129-131`
- **现象:** 编译应用子进程固定 `stdio: 'ignore'`；配置、DI、DB/Redis 或 bootstrap 失败时，门禁只留下 code/signal 或通用健康超时。
- **预期或判定依据:** 强制 production entry gate 失败时应保留有大小上限、经过脱敏的最小诊断尾部。
- **影响:** 不造成假通过，但 CI 失败定位需本地重放，并会掩盖最初的安全配置/依赖错误。
- **根因:** 为减少成功路径日志而无条件丢弃子进程输出。
- **复现/验证方法:** 在可丢弃环境提供一个非敏感错误配置运行 verifier，观察只得到通用错误。
- **最小修复建议:** pipe 并限量缓冲 stdout/stderr；成功静默，失败输出脱敏 tail。
- **建议补充测试:** 子进程 fixture 输出 sentinel 后失败；断言 tail 可见、长度受限、secret sentinel 被移除。
- **相关 finding:** GNL-AUD-001、GNL-AUD-002。

### 6.5 Info

无正式 Info finding；一般增强建议归入路线图或 Needs Verification，避免用 Info 扩大缺陷数量。

### 6.6 Accepted Design

以下均已明确检查，未计入缺陷：

| 设计                                     | 结论与证据                                                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| production 排除 Demo route/worker        | `Inspected`：`shouldEnableDemos()` 对 production 返回 false；问题仅在 schema/common removal 边界，见 GNL-AUD-004                |
| test/provision 分支                      | `Inspected`：test 排除 queue worker并 lazy/manual registration；provision 只由安全 wrapper 用于完整真实依赖验证，设计合理       |
| `VERSION_NEUTRAL`                        | `Inspected/Executed`：Demo/health 无版本路由、root `/v1` 与文档/测试一致                                                        |
| Global cache/queue/schedule/http modules | `Inspected`：平台 root 注册与 feature consumer 分离；当前未发现重复 provider 或 common→feature import                           |
| JWT 双路径                               | `Inspected`：Passport JWT 与手写 AuthGuard 均使用相同 issuer/audience/algorithm policy，默认拒绝；不是自动语义分叉缺陷          |
| Session MemoryStore                      | `Inspected`：development 示例可用；production 启用时 fail-closed，文档有警示                                                    |
| 示例秘密与环境文件                       | `Inspected`：示例/占位被限制；production secret、CORS、DB 配置验证 fail-closed；审计未输出值                                    |
| Queue/Schedule 注册与执行开关            | `Inspected`：默认 schedule disabled，queue test/provision 分支意图有文档和测试；未发现 production worker 偷跑                   |
| Upload/SSE/WS 生命周期                   | `Inspected/Executed`：容量、并发 finalize、断连、room 隔离、cleanup/drain 有非平凡测试；真实多实例另列盲区                      |
| 破坏性 integration wrapper               | `Executed/Inspected`：4 个 policy tests 通过；显式 opt-in、loopback、disposable 命名和凭据要求 fail-closed                      |
| 日志/Sentry 隐私                         | `Executed/Inspected`：headers/query/body/cookies/user 等 deny-by-default envelope/redaction 测试通过；关闭 flush 是独立运维缺口 |
| 容器与 CI 固定                           | `Inspected/Executed`：外部 images 有 readable tag + digest，Actions 权限最小，container reference verifier 通过                 |

### 6.7 Environment Blockers

| 阻塞项                   | 分类                     | 对结论的影响                                                                       |
| ------------------------ | ------------------------ | ---------------------------------------------------------------------------------- |
| Docker CLI 不存在        | Environment              | Compose parse、镜像构建、用户/healthcheck/镜像内 artifact 和启动均未动态证明       |
| 未授权可丢弃 MySQL/Redis | Permission + Environment | migration up/down/up、full AppModule、真实 cache/queue/WS、production entry 未执行 |
| 3306 无监听              | Environment              | 即使授权，当前也缺 MySQL target                                                    |
| pnpm package index/store | Environment              | 生产 license inventory 与部分 package listing 未取得                               |

这些 blocker 不计入确认缺陷数量，也没有被误写为 Pass。

### 6.8 Needs Verification

- readiness 明确跳过应用限流并直接 ping DB/Redis；Compose 发布应用端口，但实际网络隔离、探针频率和容量未知。需要独立健康控制面或负载测试后才能判断是否构成性能/DoS 缺陷。
- 真实 Redis/BullMQ 的 outage、reconnect、stalled/retry、flow partial failure、persistence、eviction 和 replay 未验证。
- 多实例下内存 throttler、session、scheduler、upload 状态、SSE/WS routing 与滚动关停语义未验证；现行文档只覆盖部分限制。
- Sentry 最后一批事件丢失需要可控延迟 transport 动态证实；当前仅闭合“运行时无显式 flush + hard exit”代码链。
- 数据规模、migration lock、相邻 schema 版本兼容、backup RPO/RTO、key rotation 和恢复演练没有目标部署基线；不得虚构当前已发生数据破坏。
- Docker base OS 漏洞、SBOM/provenance、许可证和 Git 历史秘密扫描未完成。

## 7. 测试与 Coverage 分析

### 7.1 验证层级

| 层级                       | 本轮状态 | 实际规模                                        | 能证明什么                                                                             | 不能证明什么                                          |
| -------------------------- | -------- | ----------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Unit/component             | Pass     | 101 suites / 743 tests                          | service、controller、guard、strategy、filter、pipe、adapter、processor、配置和失败路径 | 外部依赖、真实 bootstrap 组合、多实例                 |
| 可靠性定向 Jest            | Pass     | 23 suites / 173 tests（包含于 743，不重复计数） | shutdown/cache/queue/schedule/health/upload/SSE/WS/DB 代表性异常与清理                 | 真实 Redis/MySQL/网络故障                             |
| 契约定向 Jest              | Pass     | 5 suites / 93 tests（包含于 743）               | OpenAPI/AsyncAPI/config/env template contracts                                         | 运行时 module graph 和 response body                  |
| Slice e2e                  | Pass     | 7 suites / 29 tests                             | HTTP/WS wire、CSRF/session/rate-limit 等局部装配                                       | 并非全部加载真实 `AppModule`；见 GNL-AUD-007          |
| Full AppModule integration | Blocked  | source 有 1 个集中式 integration case           | CI 设计覆盖 `/v1`、health、auth、MySQL、Redis、BullMQ、WS                              | 本轮未执行；前置失败会阻止后半段场景                  |
| Migration round-trip       | Blocked  | wrapper 计划 up/down/up                         | compiled migration 与空白/回滚 schema                                                  | 无授权 MySQL，未取得本轮 runtime 证据                 |
| Production entry           | Blocked  | verifier 计划 start/probe/SIGTERM               | `dist/src/main.js`、真实依赖和退出 code                                                | 本轮未执行；即使执行也不等于镜像内启动                |
| Docker image               | Blocked  | Docker CLI 不存在                               | image user、healthcheck、runtime asset                                                 | 全部镜像行为未动态验证                                |
| OpenAPI compiled verifier  | Pass     | 自动枚举 compiled HTTP controllers              | operationId、schema/security/CSRF response contract                                    | 环境模块图、URI bootstrap、真实 response；GNL-AUD-008 |
| Integration policy         | Pass     | 4 tests                                         | destructive wrapper 的授权与 target fail-closed                                        | 不证明 migration/full-app 本身正确                    |

### 7.2 Coverage 总值与门槛

`Executed`：`pnpm run test:cov` 实际强制 `package.json:149-160` 的全局门槛，全部通过：

| 指标       |   实际 | 门槛 | 结果 |
| ---------- | -----: | ---: | ---- |
| Statements | 84.77% |  70% | Pass |
| Branches   | 49.07% |  40% | Pass |
| Functions  | 93.35% |  70% | Pass |
| Lines      | 87.12% |  75% | Pass |

关键低覆盖不是由全局平均自动豁免：

- `src/main.ts`：Jest 0%；CI 另有 production-start gate，但本轮被阻塞。
- `src/repl.ts`：Jest 0%，也没有独立 `start:repl` smoke。
- `src/common/cache/cache.module.ts`：Statements 约 44.9%、Branches 约 17.3%；其真实 Redis factory 只计划由 full-app 补充。
- `src/common/openapi/openapi.config.ts`：Statements 约 55.1%、Branches 约 32.1%；compiled verifier 补了契约，但不补 runtime graph。
- JWT/Auth guard 等 decorator-heavy 文件 branch 约 26%；关键 token policy 由 service/HTTP tests 补充，但登录组合边界仍见 GNL-AUD-007。
- `demo-websocket-scenario.dto.ts` 为 0%；它是描述 DTO，不是关键业务执行路径。

SWC decorator/helper 会产生大量映射分支，因此单文件 branch 百分比不能直接等同于业务行为缺失；但项目仅设置 global threshold，关键文件可被高覆盖文件补偿，仍建议逐步建立关键模块门槛。

### 7.3 源码—spec 配对与测试质量

`Inspected`：所有非平凡 service/controller/guard/strategy/filter/pipe/interceptor/adapter/gateway/processor/listener 均有直接或等价行为测试。没有同名独立 spec 的 JWT/Local guard、events listener/log、serialization service、AsyncAPI controller，均可在 strategy/controller/service/module/e2e 组合中找到行为断言；未机械判作无覆盖。

`Inspected`：未发现 `.skip`、`.only`、`fit`、`fdescribe`、snapshot 滥用、空壳 provider-only suite 或未 await 的 `.resolves/.rejects`。AST 扫描的未 await async matcher 数为 0。fake timers、环境变量、临时目录、Nest app、Socket 和 integration 资源均有恢复/清理路径。

代表性强项包括：DB transaction 的 commit/rollback/release 多重失败；cache timeout/atomic capacity；queue 容量、retry 和 worker lifecycle；schedule overlap/rejection/shutdown；upload concurrent finalize/quota/cleanup；SSE completion/disconnect；WS authentication/origin/payload/room/disconnect。

主要风险：

- GNL-AUD-007：安全入口缺真实 bootstrap 组合回归。
- `full-app.integration-spec.ts:91-312` 把多能力集中在一个 case；通过时证据有效，但前置失败会降低执行完整性和定位粒度。
- `scripts/**` 不进入 Jest coverage；多数 verifier 依靠 CI 执行成功路径，内部失败分支测试较少。
- 没有 capacity/soak、随机顺序、多实例、慢网络、磁盘耗尽和长期 flaky 运行证据。

## 8. 代码、配置、API 与文档不一致项

| 声明来源                                                                           | 实际实现                                                                                                       | 可能过时/不完整的一方          | 用户影响                                                | 修正建议                                               |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------- | ------------------------------------------------------ |
| `docs/demo.md:9-18`：Demo 可整体移除、production 无 Demo                           | module graph 无 Demo route/worker，但 production migration 创建 `demo` 表；common OpenAPI 引用 Demo CSRF token | 文档与跨层 ownership 均不完整  | 删除 feature 后仍有 schema/文案；生产出现无 consumer 表 | 按 GNL-AUD-004 明确 Demo 资产边界并加 no-demo contract |
| `docs/demo.md:883-918` 与 response `authenticated`                                 | body 自报 identity/role，无 credential/auth guard                                                              | 文档/命名过强                  | 复制者可能把 session state 当可信 principal             | 按 GNL-AUD-005 接真实 auth 或改为 simulated/untrusted  |
| `@ApiBadRequestResponse('Invalid credential payload')`、SignIn DTO required fields | 真实 bootstrap 下缺 password/短错误 password 先由 LocalAuthGuard 返回 401；未知字段在成功 credential 后为 400  | 状态边界未被决策和测试固化     | 客户端对 400/401 处理与文档推断不稳定                   | 按 GNL-AUD-007 明确并回归 guard-before-pipe contract   |
| README `production-oriented examples`、`docs/` 为 operational guides               | 无完整 fresh-clone、backup/restore、Redis durability/replay、key rotation、rolling shutdown runbook            | 文档体系不完整                 | 首次启动与生产操作依赖隐含知识                          | 建集中 operations guide；GNL-AUD-006                   |
| README Quick Start                                                                 | migration 前未说明启动 MySQL/Redis、创建 database；migration 本身不创建 database                               | Quick Start 不完整             | 干净环境可能连接失败/unknown database                   | 给 Compose-dependencies 或明确手动步骤与 smoke         |
| `verify:openapi` 名称与 README “validate compiled OpenAPI contracts”               | synthetic app 扫全 compiled controllers，不加载环境模块图/URI versioning                                       | 名称可接受，但证明范围需更明确 | 容易把 contract pass 误当路由可达                       | 文档注明范围，并补 runtime `/docs-json` gate           |
| 应用 close deadline 10 秒                                                          | production-start verifier 等待 5 秒；Compose 无显式更长 stop grace                                             | 时间预算契约不一致             | 合法 drain 可能被 verifier/平台提前强杀                 | 统一配置并留外部余量；GNL-AUD-002                      |

`Executed/Inspected` 的一致项：README/AGENTS/CLAUDE/package scripts/CI 门禁顺序一致；48/48 env keys 一致；YAML defaults/types/validators/usage 未发现当前偏差；所有当前文档中的本地相对链接有效；controller method/path/version AST 与专题文档大体一致；AsyncAPI 3.0 channels/messages 与 gateway constants/DTO 对齐；build 后 config/entity/migration/start paths 对齐。

## 9. 横切风险

### 9.1 架构边界

`Inspected`：TypeScript import graph 没有 `common → features`、跨 feature 深层 import 或 runtime cycle；module/controller/service/guard 等装配没有发现孤立 provider。三个 WebSocket type-only cycles 与 Session/Upload transport coupling 均为局部 Low，不代表整体分层失效。主要跨层问题是 Demo ownership 没有延伸到 migration、artifact verifier 和 common OpenAPI（GNL-AUD-004）。

### 9.2 代表性请求链路与分层检查

| 请求/事件            | 实际链路                                                                                              | 分层结论                                         | 风险/缺口                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| Auth login           | cookie/CSRF → throttler → LocalAuthGuard/LocalStrategy → DemoAuthService → AuthTokenService/JWT → DTO | credential 与 signing 基本分离                   | guard 先于 pipe 的 400/401/429 contract 无组合 e2e；GNL-AUD-007                 |
| Session login        | session middleware → controller body → DemoSessionService regenerate/write → response DTO             | session lifecycle 有界、rotation 正确            | body identity 被标为 authenticated；service 依赖 raw Request；GNL-AUD-005/010   |
| DB create-with-audit | global middleware/pipe → controller → service → QueryRunner/repository/transaction → response         | controller 未直接持久化，rollback/release 测试强 | 真 MySQL和 migration round-trip 本轮 Blocked；生产 Demo schema 边界 GNL-AUD-004 |
| Chunk upload         | Multer limits → controller → DemoUploadService state/locks → storage adapter → DTO                    | 容量、原子 finalize、cleanup 有明确边界          | service public API 暴露 Multer type；多实例/磁盘故障未验证                      |
| WebSocket room event | adapter CORS/JWT handshake → guard/pipe → gateway → service/room → interceptor/filter/ack             | auth、room、payload 与错误事件均有 e2e           | type-only cycles；多实例 adapter/room routing 未验证                            |
| `/health/ready`      | public unversioned controller → DB ping + Redis ping → Terminus response                              | 真实关键依赖参与 readiness，公开错误脱敏         | 无 draining flag、内部错误诊断；未限流容量待验证                                |

### 9.3 安全

`Inspected/Executed`：JWT algorithm/issuer/audience/expiry、dummy password verification、authz default-deny、CSRF/CORS/session production validation、upload/path/size bounds、Pino/Sentry redaction 和 container non-root 均有直接证据。确认的安全发布问题是 GNL-AUD-001；Session 是教学信任边界而非当前 production privilege escalation。真实 proxy、TLS、对象所有权业务和多租户需求没有权威业务规格，不能臆造缺失功能。

### 9.4 数据与异步可靠性

`Inspected/Executed`：单实例 queue/cache/schedule/events/upload/SSE/WS 的超时、容量、重试、清理和多数错误路径质量较强。真正横切风险在生产状态生命周期：Demo migration ownership、Redis 同时承载可丢 cache 和较持久 queue、schema/job/cache/JWT/encryption 的版本演进、以及未执行的真实 outage/restore。无负载/历史基线时均避免声明具体数据损失或性能幅度。

### 9.5 可观测性

Pino 结构化输出和 secret redaction、Sentry privacy/background isolation 有强测试；request ID 在 HTTP 内成立。依赖 readiness 的内部诊断和 shutdown flush 分别见 GNL-AUD-003/002。跨 HTTP→queue/event/WS correlation、metrics/alerts/SLO 属于目标部署决策，当前没有足够生产承诺升级为缺陷。

### 9.6 部署与运维

构建、制品和静态 CI 链路成熟；Compose one-shot migration、非 root image 和 immutable references 设计合理。主要风险是依赖门禁失败、Docker/真实基础设施本轮未动态执行、shutdown 阶段化不足和 operations runbook 缺失。`verify:*` Pass 只能证明各自断言，不替代真实 environment/module graph。

### 9.7 模板维护成本

`Inspected`：严格 TypeScript、显式 public return、无 `any` shortcut、无 lint/type suppression、命名和 import 方向整体一致；284 处 `AI modified:` 注释经结构/抽样核对未发现系统性错误。维护成本主要集中在 Demo ownership、synthetic verifier 与真实 bootstrap 的双轨、以及局部 transport/type coupling。

### 9.8 二十六项热点裁决

|   # | 热点                            | 裁决                         | 证据摘要                                                                      |
| --: | ------------------------------- | ---------------------------- | ----------------------------------------------------------------------------- |
|   1 | Passport JWT 与手写 AuthGuard   | 设计合理                     | 共用严格 token policy；401/403 tests                                          |
|   2 | Redis readiness                 | 设计合理但有缺口             | required cache/queue dependency 纳入 ready；诊断见 GNL-AUD-003                |
|   3 | `VERSION_NEUTRAL`               | 设计合理                     | route AST、README、e2e 一致                                                   |
|   4 | slice/full-app/prod-start 层级  | 设计合理，尚需执行深层       | scripts/CI 明确区分；后两层本轮 Blocked                                       |
|   5 | 非平凡实现测试                  | 已确认问题                   | 总体配对完整；auth 组合入口缺口 GNL-AUD-007                                   |
|   6 | queue/schedule enabled 语义     | 设计合理                     | 注册/执行分支有 docs/spec；schedule 默认 off                                  |
|   7 | production MemoryStore          | 设计合理                     | production fail-fast + docs/spec                                              |
|   8 | Sentry 后台 isolation/关闭      | 已确认问题                   | isolation/privacy tests 强；shutdown flush 并入 GNL-AUD-002                   |
|   9 | Docker migration 先于 app       | 已确认问题                   | Compose 顺序正确，但 production Demo schema 边界 GNL-AUD-004；runtime Blocked |
|  10 | Quick Start 外部依赖            | 已确认问题                   | GNL-AUD-006                                                                   |
|  11 | strict TypeScript               | 设计合理                     | prod+test tsc、Nest build、ESLint 全 Pass                                     |
|  12 | 示例秘密                        | 设计合理                     | production fail-closed；值未输出                                              |
|  13 | config helper/注释/命名         | 设计合理                     | 全量 AST/search 未见规则违例                                                  |
|  14 | test 环境特殊分支               | 设计合理，深层尚需验证       | provision 恢复完整图；本轮无 infra                                            |
|  15 | bootstrap 顺序                  | 设计合理                     | instrument→factory→logger→configure→listen；相关 specs                        |
|  16 | TS 多重门禁                     | 设计合理                     | typecheck/build/lint 全 Pass                                                  |
|  17 | build globs                     | 设计合理                     | artifact Pass + 手工 265-file 核对                                            |
|  18 | root/full app/production entry  | 尚需验证                     | root slice Pass；full-app/prod-entry Blocked                                  |
|  19 | tracked env/sample secrets      | 设计合理                     | 只核对 keys/state；production validation strict                               |
|  20 | production 排除 Demo            | 已确认问题                   | route/worker 排除，但 schema/common residue；GNL-AUD-004                      |
|  21 | OpenAPI verifier vs prod graph  | 已确认问题                   | synthetic scope Low；GNL-AUD-008                                              |
|  22 | destructive wrapper             | 设计合理                     | 4 policy tests Pass，loopback/disposable fail-closed                          |
|  23 | 多实例状态                      | 尚需验证                     | 部分 docs 有限制；无真实 topology                                             |
|  24 | identity isolation/TOCTOU       | 已确认问题（教学）           | auth/WS 主要路径合理；Session trust 见 GNL-AUD-005                            |
|  25 | rotation/schema/backup/rollback | 已确认文档缺口，行为尚需验证 | GNL-AUD-006；无历史部署基线                                                   |
|  26 | `verify:*` 断言范围             | 已确认局部缺口               | artifact/openapi/source inspected；GNL-AUD-008/011；深层 Blocked              |

## 10. 未验证项、环境阻塞与剩余盲区

| 未验证项                                        | 原因                                  | 受影响结论                                                                   | 当前最高置信度/分数                    | 后续所需条件                                                              |
| ----------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------- |
| Docker Compose parse/image build/image verifier | Docker CLI 不存在；默认 DENY          | image reproducibility、user、healthcheck、asset、Alpine/native compatibility | D14/D15 最高 2（另有 High）            | 明确授权短生命周期 build；可用 Docker daemon；无长期服务                  |
| migration up/down/up                            | 无 disposable MySQL 授权；3306 无监听 | clean schema、rollback、compiled CLI、Demo table runtime                     | D9 最高 3                              | loopback disposable MySQL、显式 opt-in 与 wrapper 环境                    |
| full AppModule                                  | 无授权 MySQL/Redis                    | real DI/module graph、cache/queue/DB/WS                                      | D8/D10/D11 最高 3                      | disposable MySQL+Redis，通过 safety gate                                  |
| production entry                                | 同上                                  | `dist/src/main.js` bootstrap/readiness/SIGTERM                               | D2/D13/D15 最高 3，但 D15 因 High 为 2 | 迁移完成的 disposable deps；统一 shutdown budget                          |
| Redis/BullMQ fault injection                    | 未连接未知 6379，未启动服务           | outage/reconnect/retry/stalled/flow/replay                                   | Needs Verification                     | 独立 Redis、可控断网/重启、至少双 worker                                  |
| 多实例与滚动部署                                | 无编排环境                            | limiter/session/schedule/upload/SSE/WS/drain                                 | Needs Verification                     | 两个以上实例、sticky/pubsub 选择、preStop/grace、流量生成器               |
| readiness bypass 限流的容量                     | 无信任网络/负载基线                   | 公开 `/health/ready` 对 DB/Redis 放大程度                                    | Needs Verification，不能定性能缺陷     | 明确网络边界；QPS/timeout/DB pool load test；考虑独立 budget/singleflight |
| Sentry transport flush                          | 无真实/假延迟 transport probe         | 关闭最后事件是否实际丢失                                                     | Probable；D13 最高 3                   | fake delayed transport + SIGTERM/startup failure                          |
| DB rollout/backup/key rotation                  | 无生产数据规模与策略                  | lock、RPO/RTO、旧密文、rollback                                              | Needs Verification；D9/D15 最高 3/2    | 人工确定责任与目标；相邻版本/restore/key-ring 演练                        |
| 许可证/SBOM/OS scan                             | pnpm index 被阻塞；未 build image     | license compatibility、base OS CVEs、provenance                              | Needs Verification                     | 修复本地 package index；license/SBOM/image scanner                        |
| `start:repl`                                    | 未执行 watcher/交互进程               | REPL entry 可用性                                                            | Low-confidence DX blind spot           | 短生命周期 REPL smoke 或 CI fixture                                       |
| 外部文档链接/专业翻译                           | 未访问外网链接；无专业译审            | 外链存活和中英细微语义                                                       | Inspected 仅限本地链接/技术语义        | link checker 网络；人工双语 review                                        |
| 权威业务需求                                    | 仓库只有模板定位，无产品 PRD/威胁模型 | 不可判断未承诺业务功能、租户模型、SLO                                        | Assumed；不计缺陷                      | 维护者提供目标部署、威胁模型、RPO/RTO/SLO                                 |

本节任何项都没有用“应当没问题”结尾；后续条件满足前，不应把静态/CI 声明替换为本轮执行证据。

## 11. 分阶段修复路线图

本节只提出建议，不实施任何修改。

### Phase 0 — 发布阻断与安全门禁

| 项目                                           | Finding              | 预期收益                                                | 变更风险                                                | 验收方法                                                                                                    |
| ---------------------------------------------- | -------------------- | ------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 将两个传递依赖收敛到已修复 patch               | GNL-AUD-001          | 恢复强制 production dependency gate；消除已知 High 版本 | lockfile 变化可能改变传递树；需防重复旧路径             | frozen install；`pnpm why --prod`；`audit:prod` 0 High；完整 lint/type/unit/e2e/build                       |
| 在一次获准的 disposable 环境补跑全部被阻塞门禁 | Environment Blockers | 取得 migration/full-app/prod-entry/image 的真实证据     | 数据库命令具破坏性，只能在 safety wrapper 和空白 target | `docker compose config`、image build/verify、migration up/down/up、full-app、production-start 全部实际 Pass |

只有 GNL-AUD-001 修复且强制门禁实际返回 0，才可移除当前 `Not Ready` 的确认 High 原因；不能用“可达性有限”跳过发布门禁。

### Phase 1 — Medium、关键测试与契约

| 项目                                                                                    | Finding     | 预期收益                                                      | 变更风险                                                   | 验收方法                                                                               |
| --------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 阶段化 shutdown：unready → propagation → admission close/drain → telemetry flush → exit | GNL-AUD-002 | 降低滚动发布请求失败和最后观测丢失                            | shutdown lifecycle、容器 grace 和 public health 语义会改变 | 并发长请求/SIGTERM 时间线；fake Sentry transport；真实 production-start；预算契约 test |
| 给 DB/Redis readiness 添加安全、限频内部诊断                                            | GNL-AUD-003 | 依赖故障可定位且不泄密                                        | 原始 driver error 可能带 secret；日志风暴                  | secret sentinel、timeout/refused/recovery、sampling tests；故障注入                    |
| 明确并统一 Demo schema/common/removal contract                                          | GNL-AUD-004 | production 与“可移除”声明一致                                 | migration/schema/公开 docs contract 是高风险决策           | no-demo build/OpenAPI；production graph；空白 schema migration；artifact verifier      |
| 修正 Session trusted identity 教学边界                                                  | GNL-AUD-005 | 防止示例被复制成角色伪造                                      | 若接真实 auth，会改变示例 API/模块依赖                     | anonymous body 不建 trusted user；真实 principal 绑定；session rotation/limits 回归    |
| 建立 production operations 指南与演练                                                   | GNL-AUD-006 | fresh clone、数据恢复、Redis queue、rotation、shutdown 可执行 | RPO/RTO、key ring、Redis 拓扑需人工定责                    | docs link check；disposable fresh clone；restore/replay/key rotation/shutdown drills   |
| 给 auth login 增加真实 bootstrap 组合 e2e                                               | GNL-AUD-007 | 固化 400/401/429 和 security lifecycle 顺序                   | 状态码决策可能影响客户端契约                               | malformed/credential/unknown field/第六次请求/CSRF matrix                              |

### Phase 2 — Low、清晰度与 DX

| 项目                                                        | Finding     | 预期收益                                  | 变更风险                    | 验收方法                                                           |
| ----------------------------------------------------------- | ----------- | ----------------------------------------- | --------------------------- | ------------------------------------------------------------------ |
| 为 OpenAPI verifier 增加 versioning/runtime graph 辅助 gate | GNL-AUD-008 | 避免 synthetic contract 被误当真实 route  | 不应让 test app连接基础设施 | `/docs-json` smoke；`/v1` path；未装配 controller negative fixture |
| 把 WebSocket socket contract 移到中立 types 文件            | GNL-AUD-009 | 去除 type-only cycle，降低演化风险        | 纯内部 import 变更          | typecheck、cycle scan、WS unit/e2e                                 |
| 收窄 Session/Upload service transport inputs                | GNL-AUD-010 | application service 更易复用/替换 adapter | 避免为了分层引入过多抽象    | service unit + HTTP/session/upload contract regression             |
| production-start 失败时输出有界脱敏日志 tail                | GNL-AUD-011 | CI 启动失败可诊断                         | 必须避免 secrets 和无限输出 | child fixture、size cap、redaction sentinel、真实失败 smoke        |

### Human Decisions

以下决定超出只读审计权限；实施前需要维护者确认：

1. **Demo schema 是否属于正式 production contract。** 若删除/调整 migration，属于数据库 schema 和模板升级策略决策。
2. **Session demo 是否接入真实 auth。** 会影响 auth/authz 和示例公共 API；不能由审计者自行选择。
3. **shutdown readiness/public health contract。** draining 状态、preStop、grace period 与平台编排需共同定义。
4. **Redis 拓扑与耐久性。** cache/queue 是否分实例、AOF/RDB、maxmemory policy、replay 和 RPO/RTO 需运维决定。
5. **Encryption key ring 与 schema rollout。** 旧 key 保留、重加密、expand/contract 和 rollback 边界涉及持久数据。
6. **是否把 synthetic OpenAPI gate 扩展为真实 development module gate。** 需要在“无基础设施快速 gate”和“真实 reachability”间分工，而不是简单替换。

## 12. 附录

### 12.1 审计前文件与结构计数

以下计数来自写报告前的 `rg --files` 清单，排除 `node_modules/`、`dist/`、`coverage/`、`documentation/` 和 `.git/` 等 ignored/generated/third-party 路径：

| 分类             |                                        数量 |
| ---------------- | ------------------------------------------: |
| 清单总路径       |                                         432 |
| `src/common`     |                                          93 |
| `src/features`   |                                         238 |
| `src/bootstrap`  |                                           5 |
| `src/migrations` |                                           2 |
| `config`         |                                          16 |
| `test`           |                                          11 |
| `docs`           | 22（16 份现行文档 + 6 份历史审计/设计材料） |
| `scripts`        |                                           7 |
| `prompts`        |                                           2 |
| `.github`        |                                           1 |
| 根级/其他配置    |                                          23 |
| TypeScript 文件  |                                         372 |
| Markdown 文件    |                                          28 |

| 结构类型                                     |                         数量 |
| -------------------------------------------- | ---------------------------: |
| modules                                      |                           36 |
| controllers                                  |                           24 |
| services                                     |                           34 |
| guards                                       |                            8 |
| strategies                                   |                            2 |
| filters / pipes / interceptors               |                    1 / 2 / 2 |
| adapters / gateways / processors / listeners |                1 / 1 / 1 / 1 |
| DTOs                                         |                           92 |
| entities / migrations                        | 1 / 1（另有 migration spec） |
| unit/component specs                         |                          101 |
| e2e files                                    |                            7 |

### 12.2 已检查与未检查的一方文件清单

为避免在报告中粘贴 425 行而失去可复核性，采用精确集合定义保留清单：

```text
审计前 manifest = `rg --files` 的 432 条输出
已检查当前一方文件 = manifest
  - docs/audits/**（4 个历史文件）
  - docs/superpowers/**（2 个历史设计文件）
  - .cursor/self-audit-state.md（1 个工具状态文件）
```

因此，**已检查当前一方文件集合为 425 条，未检查当前一方文件集合为空**。所有非平凡 `.ts/.mjs` 实现均读取内容或通过 AST/import graph/测试映射深入检查；配置、现行文档、测试、脚本和 prompt 逐类核对。上述 7 个排除文件已被识别和分类，但没有把其中的历史结论作为当前实现证据。生成的本报告不属于审计输入 manifest。

### 12.3 四种环境模块图

| 环境        | 模块/配置事实                                                                                                              | 可达能力                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| development | AppModule 平台 modules + 完整 DemosModule；dotenv development priority；OpenAPI enabled；schedule 默认 off                 | `/v1`、health、全部 Demo、AsyncAPI；queue worker按 config     |
| test        | AppModule 可包含 DemosModule，但 DemosModule 排除 DemoQueueModule；BullMQ lazy/manual；Sentry init skip；schedule disabled | unit/slice isolation，不自动证明 production wiring            |
| provision   | destructive wrapper 显式设置；完整 DemosModule + queue worker；Sentry skip                                                 | 只用于 loopback disposable MySQL/Redis full-app，不是部署环境 |
| production  | DemosModule 整体排除；平台 cache/queue/schedule/health 等常驻；OpenAPI/AsyncAPI 不可达；secrets/DB/CORS fail-closed        | `/v1` + health；仍会编译/执行 Demo migration，见 GNL-AUD-004  |

### 12.4 六分区实际覆盖

| 分区                     | 实际范围                                                            | 关键方法                                          | 结果                                                      | Mutation |
| ------------------------ | ------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------- | -------- |
| A 完成度/架构/清晰度     | module graph、common/features、分层、类型、命名、注释               | AST import/cycle/public return、代表链路          | 1 Medium + 2 Low 候选，合并为 004/009/010                 | 无修改   |
| B 正确性/可靠性/性能     | cache/queue/schedule/events/HTTP/upload/SSE/WS/DB/shutdown          | 定向 23 suites/173 tests + lifecycle trace        | shutdown Medium；readiness capacity 转 Needs Verification | 无修改   |
| C 安全/供应链            | auth/authz/JWT/CSRF/CORS/session/upload/log/Sentry/deps/Docker/CI   | audit/why/advisory reachability                   | 1 High + Session Medium                                   | 无修改   |
| D 测试/验证质量          | 101 specs、7 e2e、full-app、scripts、coverage                       | AST async matcher、pairing、短生命周期 auth probe | auth Medium + production diagnostic Low                   | 无修改   |
| E 文档/契约              | README、16 现行 docs、DTO/controllers、OpenAPI/AsyncAPI/env/scripts | links、48-key diff、route AST、5 suites/93 tests  | 运维 docs 合并为 006；OpenAPI Low                         | 无修改   |
| F 配置/数据/观测/交付/DX | config/TypeORM/health/logger/Sentry/Docker/CI                       | config-to-use、artifact/installed runtime trace   | health Medium；shutdown/Demo/docs 去重合并                | 无修改   |

### 12.5 重点搜索与静态结果

- `Inspected`：无 `TODO/FIXME/HACK`、占位实现、`.skip/.only`、TypeScript/lint suppression、production `console.log` 或显式 `any` shortcut。
- `Inspected`：无 `common → features` import、无跨 feature import、无 runtime cycle；有 3 条 WebSocket type-only cycle（GNL-AUD-009）。
- `Inspected`：所有 public methods/exported functions 有显式 return type。
- `Inspected`：未发现违反仓库 `normalize/parse/transform/convert/format/build/map` 一次性字段搬运命名禁令的新增 helper。
- `Inspected`：284 处 `AI modified:` 注释经全量结构检查与代表性抽样，未形成错误/噪声 finding。
- `Executed`：本地 Markdown 相对链接无死链；`.env.example` 与 validator 为 48/48；文档 `pnpm` 命令均存在。
- `Inspected`：当前路由、HTTP method、`VERSION_NEUTRAL`、主要 DTO/status、AsyncAPI events 没有除第 8 节外的确认偏差。

### 12.6 生成物与允许副作用

| 路径              | 审计前状态/证据                         | 本轮影响                                      | Git 状态        |
| ----------------- | --------------------------------------- | --------------------------------------------- | --------------- |
| `node_modules/`   | 确认审计前存在；birth 2026-05-21        | 未执行 install，未主动修改                    | ignored         |
| `coverage/`       | birth 2026-07-15，审计前已存在          | `test:cov` 更新 coverage files                | ignored         |
| `documentation/`  | birth 2026-07-22，审计前已存在          | `compodoc` 更新生成文档                       | ignored         |
| `src/metadata.ts` | birth 2026-07-28，审计前已存在          | build 于 10:55 更新 Swagger metadata          | ignored         |
| `dist/`           | 当前目录 birth 2026-08-04 10:55         | build 生成/重建 265-file artifact；未手工删除 | ignored         |
| pnpm 网络/cache   | package audit/version metadata 只读访问 | 可能更新工具自身 cache；未改 lockfile         | 不在 Git 工作区 |
| 临时 auth probe   | 本机随机端口、短生命周期                | 立即关闭，无外部服务/持久文件                 | 无工作区文件    |

一次诊断 shell 曾使用 zsh 特殊变量名导致该子 shell 的 `PATH` 被覆盖，`stat/rg` 调用失败；随后用非保留变量和绝对工具路径重试成功。它属于 `Tool invocation`，没有修改工作区，也不计项目失败。

### 12.7 条件命令与 Not Applicable

第 6.3 节五个条件命令均已在命令矩阵给出 Blocked 状态，没有遗漏或假装通过。能力矩阵没有 `Not Applicable` 行，因为 27 项均是仓库明确声明或真实存在的能力；没有为满足矩阵而虚构额外业务能力。

### 12.8 Mutation Guard

`Executed`：使用与审计开始完全相同的 `git status --porcelain=v1 -z` 模式复算，结束指纹仍为：

```text
4859990cee2a3844d65bd4de2e9a3eafa0453caa63ea9a2c5cdfea4f027d8717
```

状态类别也与开始一致：worktree modified 267、deleted 6、index modified 4、默认折叠的 untracked entries 53。由于 `docs/audits/` 在开始时已经是 untracked directory，默认 porcelain 会把本报告折叠进原有目录条目；`--untracked-files=all` 单独确认当前 65 个未跟踪文件中只有本报告的 birth time 位于审计窗口，其他 64 个均早于本轮。报告以外没有新建的可见一方文件。

更精细的 mtime 检查发现以下 7 个**审计前已经存在且处于既有 dirty 状态**的路径在 11:20:57 被并发更新：

```text
.cursor/self-audit-state.md
README.md
docs/cache.md
docs/health.md
docs/project-notes.zh-en.md
src/common/health/health.controller.ts
src/examples/demo-sentry/demo-sentry.controller.spec.ts
```

本轮主控和六个分区均确认没有写这些文件；获准命令也不会以它们为输出，因此本报告不把更新归因给审计，也无法在不比较历史/HEAD 的前提下确定外部写入者或内容差异。没有 reset、checkout、删除或覆盖这些文件。主控在发现后重新读取全部 7 个路径；当前内容不推翻本报告 finding，并额外执行当前状态的 `format:check`、`lint:check`、production+test `typecheck` 及相关 2 suites/5 tests，全部 Pass。7 文件当前组合 SHA-256 为 `e56b349e2d97463a5303e8c10c2787071ca8d4ec1a7ac2e98b151d88a942e627`，供后续识别是否继续变化。

因此 mutation 结论是：**本审计主动写入仅为本报告和允许的 ignored verification artifacts；但审计窗口存在无法归因于本轮的并发外部更新，工作区不是完全静止快照。** 报告中涉及上述文件的结论已基于更新后的当前内容复核；审计前运行的完整 coverage/build 数字仍来自并发更新时间之前，这一时间边界不能隐藏。

### 12.9 审计完成门槛

`Inspected/Executed`：`src/common`、`src/features`、`src/bootstrap`、`src/migrations`、`config`、`test`、现行 `docs`、`scripts`、`prompts`、`.github`、根级构建/TS/SWC/Jest/lint/format、CI/Docker/production path 均已盘点；development/test/provision/production 图已重建；27 项矩阵、六分区、D1–D15、全部固定/条件命令、26 个热点和正式 finding 证据均完整。被环境/权限阻塞的动态步骤已明确状态并由静态审计补足其可审部分。

本次可表述为：**审计在用户授权的 `AUDIT_ONLY` 范围内完成，并披露了并发工作区更新限制；项目本身并非“全部通过”，发布判定仍为 Not Ready。**
