# gnester-lite 当前工作区一次性完整只读审计

## 1. 审计元数据、范围与限制

- **审计日期与时区：** 2026-07-28，Asia/Shanghai；审计开始约 14:44 CST，报告定稿约 15:33 CST。
- **审计对象：** `/Users/guoxk/me/i/gnester-lite` 当前工作区，而不是某个历史提交的差异。
- **Git 元数据：** 分支 `master`；当前提交标识 `7683b6a4433eb6d89d266e11e2161635b1d7a7a5`。本次**未比较 HEAD、未修复代码、未 commit、未 push**。
- **环境：** Darwin 25.1.0 arm64；Node.js v24.18.0；pnpm 11.1.2。
- **起始 mutation baseline：** `?? .cursor/`、`?? docs/audits/`、`?? docs/superpowers/`、`?? prompts/`。这些目录在审计开始前已存在；不得据此推断为本次变更。
- **已读取范围：**
  - `src/common` 77 个文件、`src/features` 222 个文件、`src/bootstrap` 2 个文件、`src/migrations` 1 个文件；
  - `config` 12 个文件、`test` 5 个文件、产品文档 17 份（README + 16 份顶层专题文档，共 2,740 行）；
  - 20 个根级运行/构建/容器/质量文件，以及 `.github/workflows/ci.yml`；
  - 36 个 module、23 个 controller、33 个 service、全部 guard/strategy/filter/pipe/interceptor/decorator/adapter/gateway/processor/listener、83 个 DTO、1 个 entity、1 个 migration、84 个 unit spec 与 4 个 e2e spec。
- **执行方式：** 主控并行组织 A（完成度/架构）、B（正确性/可靠性）、C（安全/供应链），随后复用分区执行 D（测试）、E（文档）、F（配置/交付）；主控重新打开所有 High 和代表性 Medium 的第一方及已安装依赖证据，完成去重和定级。
- **已检查第一方文件：** 上述声明范围内的生产源码、测试、配置、CI、容器、根级工具配置与产品文档均已按内容检查。`docs/audits/**`、`docs/superpowers/**` 仅作为既有历史/工作资料盘点，不以其中结论替代本次证据。
- **未检查第一方文件：** 声明范围内无未说明遗漏。生成目录 `dist/`、`coverage/`、`documentation/` 仅检查与交付/覆盖相关的产物，不逐文件做源码审计。
- **排除项：** `node_modules` 只在验证具体依赖行为时定向读取；`.git`、IDE 资料、历史审计结论、真实 secret 值、未提供的云/Kubernetes 配置不在功能审计范围。
- **安全边界：** 未输出 `.env.*` 的值；未连接或修改 MySQL/Redis；未运行 migration；未启动完整生产应用；未 build/run Docker；未发真实外部写请求。
- **关键环境限制：**
  - Docker CLI 不可用，Compose 解析和镜像级验证为 `Blocked`；
  - 未提供用户确认的、隔离且可丢弃的 MySQL/Redis，完整 `AppModule`、migration、真实 queue/cache/database 集成为 `Unverified`；
  - 首次 coverage 在沙箱监听上遇到 `EPERM`，经用户授权在允许监听的环境有效重跑并通过。

结论标签在全文统一使用：

- **Executed：** 实际运行命令或只读探针得到的事实；
- **Inspected：** 直接读取代码、配置、产物或依赖实现得到的事实；
- **Assumed：** 仅在明确标注的条件性分析中使用，不作为 Confirmed finding 的唯一证据。

## 2. 执行摘要

**一句话结论：** gnester-lite 的能力广度、单元测试和本地构建基础较好，但当前生产默认装配存在 5 个确认 High：Demo/固定凭据暴露、敏感请求头入日志、WebSocket 与全局限流冲突、migration 交付链断裂、匿名分片上传无生命周期；因此不能按现状发布。

- **Overall readiness：`2/5`**
- **十五维度算术平均：`2.1/5`**（仅作参考）
- **发布判定：`Not Ready`**
- **正式 finding 数量：** Blocker 0、High 5、Medium 23、Low 11、Info 1。
- **能力闭环：** 27/27 项均有实现入口；其中 Complete 6、Partial 21、Missing 0。

最高风险前五项：

1. `GNL-AUD-001`：production 无条件装配全部 Demo，公开固定 Demo 身份可签发真实运行时 JWT，且多类状态变更/诊断接口无授权。
2. `GNL-AUD-002`：Pino 自动访问日志记录完整 `Authorization`、`Cookie` 等敏感 header。
3. `GNL-AUD-003`：全局 stock `ThrottlerGuard` 进入 WebSocket context 并调用 HTTP `res.header()`，真实生产 WS 消息路径失败。
4. `GNL-AUD-004`：实际 migration 在 `dist/src/migrations`，配置查找 `dist/migrations`，生产容器又没有 migration 执行链。
5. `GNL-AUD-005`：生产可达的匿名分片上传无认证、TTL、取消、配额或完成文件生命周期，可持续累积内存和磁盘。

证据边界：

- **模板可学习：部分具备。** `Inspected`：模块/专题覆盖面广，crypto、CSRF、events、Helmet、serialization、validation 形成较完整闭环；但 OpenAPI/AsyncAPI、五个 Demo 的使用文档、全局 CSRF 示例前置条件存在实质偏差。
- **本地可验证：具备较强基础。** `Executed`：lint、独立 TypeScript、84/349 unit、coverage、build、4/10 slice e2e、Compodoc 均通过。
- **生产可部署：证据不足且存在确认阻断。** `Inspected/Executed`：migration 路径与镜像流程断裂、Docker 资产不全、无完整 AppModule/真实 MySQL/Redis 门禁、默认 Demo 暴露。
- **不能下结论的关键盲区：** 真 MySQL/Redis 行为、fresh-volume migration、完整 production AppModule、Docker UID/文件/端口、真实 Sentry、反向代理拓扑、慢客户端/多实例/负载与第三方漏洞实际 exploitability。

## 3. 环境与验证命令矩阵

### 3.1 预定命令

| 命令                                                                                                             | 状态    | 退出码 |       耗时 | 失败类型    | 证据摘要                                                              |
| ---------------------------------------------------------------------------------------------------------------- | ------- | -----: | ---------: | ----------- | --------------------------------------------------------------------- |
| `node --version`                                                                                                 | Pass    |      0 |      <0.1s | —           | `v24.18.0`。                                                          |
| `pnpm --version`                                                                                                 | Pass    |      0 |      0.44s | —           | `11.1.2`，与 package/CI/Docker 一致。                                 |
| `pnpm install --frozen-lockfile`                                                                                 | Skipped |      — |          — | —           | `node_modules` 已存在；锁文件 importer 已检查，无需产生安装写入。     |
| `pnpm run lint:check`                                                                                            | Pass    |      0 |     14.55s | —           | ESLint 只读检查通过。                                                 |
| `pnpm exec tsc -p tsconfig.build.json --noEmit --incremental false`                                              | Pass    |      0 |      1.48s | —           | 独立 TypeScript 检查通过。                                            |
| `pnpm run test`                                                                                                  | Pass    |      0 |      6.81s | —           | 84 suites、349 tests 全通过。                                         |
| `pnpm run test:cov`（首次沙箱）                                                                                  | Blocked |   非 0 | 未单独记录 | Environment | 监听 `0.0.0.0` 得到 `EPERM`；仅跑到 2 suites/14 tests，不计项目失败。 |
| `pnpm run test:cov`（授权有效重跑）                                                                              | Pass    |      0 |      9.72s | —           | 84 suites、349 tests；S 83.43%、B 44.82%、F 92.75%、L 85.79%。        |
| `pnpm run build`                                                                                                 | Pass    |      0 |      3.96s | —           | TSC 0 issue，SWC 322 files；`dist/src/main.js` 与 YAML 资产存在。     |
| `pnpm run test:e2e`                                                                                              | Pass    |      0 |      4.02s | —           | 4 suites、10 tests；均为切片装配，不是完整 AppModule。                |
| `pnpm run compodoc`                                                                                              | Pass    |      0 |     22.00s | —           | Compodoc 2.0.0；`documentation/index.html` 生成。                     |
| `pnpm exec prettier --check "src/**/*.ts" "test/**/*.ts" "config/**/*.ts"`                                       | Pass    |      0 |      4.45s | —           | TS/config/test 格式通过。                                             |
| `pnpm exec prettier --check "README.md" "docs/**/*.md" "prompts/**/*.md" "*.{json,yaml,yml}" ".github/**/*.yml"` | Fail    |      1 |      2.96s | Code        | 9 files 未通过；其中 7 个是当前产品文档/根交付文件。                  |
| `docker compose config --quiet`                                                                                  | Blocked |    127 |      <0.1s | Environment | 当前环境无 Docker CLI。                                               |
| `pnpm audit --prod`                                                                                              | Fail    |      1 |      1.41s | Security    | 58 项：2 Critical、28 High、25 Moderate、3 Low。                      |
| 完整 `AppModule` + 真 MySQL/Redis smoke                                                                          | Skipped |      — |          — | —           | 依审计安全边界，需用户另行提供隔离、可丢弃环境。                      |
| `docker compose up` / `docker build`                                                                             | Skipped |      — |          — | —           | 审计提示词明确禁止，且 Docker 不可用。                                |
| `migration:run/revert` / `DB_SYNCHRONIZE=true`                                                                   | Skipped |      — |          — | —           | 可能修改数据库；未获独立授权。                                        |

预定矩阵统计：**Pass 10、Fail 2、Blocked 2、Skipped 4**。Fail 均已继续后续检查；Blocked/Skipped 已降低对应生产就绪评分。

### 3.2 定向只读探针

以下均为 `Executed`，用于复核静态候选，不计入上表预定命令统计：

- stock `ThrottlerGuard` + WS execution context：得到 `TypeError: res.header is not a function`；
- JWT 三路径：错误 issuer/audience、HS512 token 被直接 `JwtService.verifyAsync(token)` 接受，而 Passport strategy 会按 issuer/audience 拒绝；
- JWT TTL：配置 `1h` 时真实 token 生命周期为 3600 秒，登录响应仍为 `15m`；
- `FileTypeValidator`：纯文本 buffer + 客户端声明 `image/png` 在 `fallbackToMimetype:true` 下返回有效；
- OpenAPI：`SignInDto` 与 session login DTO 生成 `properties:{}`，profile operation 无 security；
- AsyncAPI：生成 11 channels，含无 runtime emit 的 detail channel；scenario 响应将数组声明为单对象；
- Nest 路由 introspection：真实 URI versioning 下 AppController 只暴露 `GET /v1`，而 app e2e 断言 `/`；
- Pino serializer：completion log 保留审计占位 `authorization`/`cookie`；`?probe=/health` 可触发 access-log ignore；
- 构建产物：migration glob 命中 0，entity glob 命中 1；84 个 spec JS、322 个 source maps；
- Markdown 本地路径检查：产品 Markdown 未发现断链；全量反引号第一方路径中确认 2 处陈旧 `FindDemoParamsDto` 引用；
- `pnpm why ... --prod`：重点漏洞经直接 production dependency `nestjs-asyncapi`、直接 axios/typeorm 及 Nest/Express 链进入生产树。

一次 coverage 读取脚本误找不存在的 `coverage-summary.json`、若干可选 audit JSON/filter 网络重试及文档 probe 缺 preload，均属纠正后的 `Tool invocation`，不计项目失败；有效证据来自 `coverage-final.json`、有效 `pnpm audit` 和修正后的内存探针。

## 4. 十五维度评分卡

| 维度                          | 分数 | 最高严重度 | 证据摘要                                                                 | 主要扣分原因                                                       |
| ----------------------------- | ---: | ---------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| D1 模板能力完成度             |    2 | High       | 27 项能力均可达；6 Complete/21 Partial；`GNL-AUD-001/005`                | Demo 生产默认暴露，多个能力闭环只停留在切片/文档层。               |
| D2 功能正确性与错误处理       |    2 | High       | 349 unit、10 e2e 通过；`GNL-AUD-003/004`                                 | WS 真实装配失败、migration/资源失败路径有确认缺陷。                |
| D3 认证与授权                 |    2 | High       | Passport/roles/permissions/policies 单测较强；`GNL-AUD-001/006/020`      | 固定 Demo 身份进入生产；JWT consumer 语义和 TTL 响应不一致。       |
| D4 HTTP 与会话安全            |    2 | High       | CORS/CSRF/Helmet/MemoryStore 生产保护较好；`GNL-AUD-001/003/023/027`     | 危险 Demo 缺授权，全局 HTTP guard 错施于 WS，健康/文档边界不闭环。 |
| D5 输入、网络、文件与秘密安全 |    2 | High       | ValidationPipe、crypto、路径/SQL 参数化检查通过；`GNL-AUD-002/005`       | 日志泄露认证材料，匿名上传可耗尽资源。                             |
| D6 架构与依赖边界             |    3 | Medium     | 无 common→features import、无 sibling feature 深导入；`GNL-AUD-029/030`  | common 中仍泄漏 Demo WS 契约，HTTP 直接返回 ORM entity。           |
| D7 类型、清晰度与可维护性     |    3 | Medium     | 独立 tsc/lint 通过，显式 `any` 为 0；`GNL-AUD-022/039`                   | 声称 strict 但门禁关闭，机械注释和禁用命名规则漂移。               |
| D8 配置正确性                 |    2 | High       | YAML 19 叶字段闭环、env 48 键均被校验；`GNL-AUD-004/016/017`             | migration/Sentry/文档-env 来源不一致影响生产路径。                 |
| D9 数据库与迁移               |    2 | High       | entity 与 migration schema 一致；`GNL-AUD-004/010`                       | 生产 migration 不可发现/执行，且事务启动失败泄漏 QueryRunner。     |
| D10 异步与集成可靠性          |    2 | High       | SSE/streaming/queue/schedule 基础单测较好；`GNL-AUD-003/005/008/012/013` | WS、upload、cache、queue、Redis 故障与并发语义存在实质缺陷。       |
| D11 测试覆盖与质量            |    2 | High       | 84/349 unit、4/10 e2e、coverage 有效；`GNL-AUD-003/021`                  | 0 个完整 AppModule e2e，切片测试已产生错误绿灯。                   |
| D12 API 与文档契约            |    2 | High       | 路由/专题盘点完成；`GNL-AUD-004/019/020/023-026`                         | OpenAPI/AsyncAPI、CSRF 示例、TTL、容器资产和启动文档存在系统偏差。 |
| D13 可观测性与健康检查        |    2 | High       | Pino/Sentry/Terminus 均已接入；`GNL-AUD-002/013/014/016/028`             | secret redaction、Redis readiness、关停和 access-log 过滤不可靠。  |
| D14 构建、交付与仓库卫生      |    2 | High       | lint/test/build/e2e/Compodoc 通过；`GNL-AUD-004/015/018/036/038`         | migration/容器/供应链/产物和格式门禁不能支撑可信发布。             |
| D15 开发者体验与生产就绪度    |    2 | High       | Node/pnpm/脚本一致；`GNL-AUD-001/004/017/026`                            | clean clone、生产配置、Demo 移除、真实依赖与部署步骤不闭环。       |

## 5. 全量能力矩阵

`Complete` 表示现有职责在实现、装配、测试和说明之间形成闭环；`Partial` 表示存在确认缺陷、关键测试/文档或生产集成缺口。

| 能力            | common/bootstrap                           | demo/consumer                                  | module wiring                       | config                          | unit tests                             | e2e                   | docs                        | runtime dependency      | 状态     | 证据/缺口                                                                          |
| --------------- | ------------------------------------------ | ---------------------------------------------- | ----------------------------------- | ------------------------------- | -------------------------------------- | --------------------- | --------------------------- | ----------------------- | -------- | ---------------------------------------------------------------------------------- |
| auth            | `common/auth` JWT/Passport/hash/手写 guard | `demo-auth`、authorization、WS                 | feature 导入 CommonAuth；Demos 聚合 | `JWT_*`                         | guard/hash/strategy/service/controller | app slice             | security/demo               | Node crypto/JWT         | Partial  | TTL 响应硬编码；Passport/手写/WS verifier 语义不一；无 full-app e2e。              |
| authorization   | roles/permissions/policies                 | `demo-authorization`                           | feature 导入 auth + authorization   | claims，无独立键                | 三类 guard 与 demo                     | 无                    | security/project-notes      | 无                      | Partial  | 行为单测好；无 HTTP 级组合 e2e，且依赖较弱的手写 verifier。                        |
| cache           | 全局 CacheModule/Service/interceptor       | `demo-cache`                                   | AppModule + 全局 provider           | `cache.ttl`、`REDIS_URL`        | service/interceptor/demo               | 无真实 Redis          | cache                       | Redis                   | Partial  | index 非原子；interceptor 无 consumer；真实 Redis 未验证。                         |
| configuration   | ConfigModule、YAML/env validator/types     | `demo-config`                                  | AppModule global                    | YAML + `.env.<env>` + `.env`    | 5 份 config tests + demo               | 无生产启动            | configuration/README        | env、YAML               | Partial  | Sentry 预加载、env 文档/precedence、production baseline 不闭环。                   |
| cookies         | cookie-parser bootstrap                    | `demo-cookies`                                 | configure + Demos                   | `COOKIE_SECRET`                 | decorator/service/controller           | 无                    | project-notes/零散 security | HTTP Cookie             | Partial  | 行为受测；缺 cookie-jar e2e 和完整使用指南。                                       |
| cors            | options factory + enableCors               | `demo-cors`                                    | configure + Demos                   | `CORS_*`                        | config/demo/bootstrap                  | 无真实 preflight      | configuration/security      | HTTP/browser            | Partial  | 生产拒绝规则好；实际 Origin/preflight/credential 响应未验证。                      |
| crypto          | CommonCrypto：scrypt/AEAD/HMAC/token       | `demo-crypto`                                  | feature import                      | `ENCRYPTION_KEY`、`HMAC_SECRET` | 成功/篡改/异常均覆盖                   | N/A                   | security/demo               | Node crypto             | Complete | 当前职责闭环；生产 key 强度策略仍见 `GNL-AUD-007`。                                |
| csrf            | CsrfService + bootstrap middleware/error   | `demo-csrf`                                    | AppModule + feature + configure     | `CSRF_*`、cookie/session        | service/controller/bootstrap           | 真实 middleware slice | security/demo               | Cookie/session          | Complete | 403/token/success 契约有 e2e；跨文档 mutation 前置未传播。                         |
| database        | TypeORM root/CLI/entity/migration          | `demo-database`                                | root + feature repository           | `DB_*`                          | config/service/controller mocks        | 无真实 DB             | database/demo               | MySQL 8                 | Partial  | migration glob/交付失败；QueryRunner 失败路径；无真实 integration。                |
| events          | EventEmitter root                          | `demo-events` listener/log                     | AppModule + feature provider        | 无                              | 真实 EventEmitter slice                | 无独立 e2e            | demo/project-notes          | 进程内 emitter          | Complete | fan-out/wildcard/clear 受测，职责明确为进程内 Demo。                               |
| health          | Terminus controller                        | deployment probes                              | AppModule                           | DB；无 Redis 配置项             | controller mock                        | 无真实依赖            | health/README               | MySQL、实际还依赖 Redis | Partial  | ready 仅 MySQL；真实 probe 未 skip throttle；无 app healthcheck。                  |
| http-client     | 全局 Axios options                         | `demo-http`                                    | AppModule + global HttpService      | `http.*`                        | options/service/controller             | 无外网                | demo/configuration          | 外部网络                | Partial  | timeout/limit/error mapping 好；upstream response 无运行时 schema 校验。           |
| logger          | Pino module + main attach                  | 全应用                                         | AppModule + main                    | `LOGGER_*`、app.name            | config                                 | 无真实日志 e2e        | logger                      | stdout/backend          | Partial  | 敏感 header 未 redact；health 子串可关闭 access log。                              |
| openapi         | bootstrap setup                            | 全 HTTP controllers/DTO                        | configure（非生产）                 | `NODE_ENV`                      | setup mock                             | 无完整文档 e2e        | openapi/README              | 无                      | Partial  | 代表性请求 schema 为空、protected operation 无 security、无错误契约。              |
| asyncapi        | bootstrap setup                            | demo WS decorators/doc provider                | configure（非生产）                 | `NODE_ENV`、PORT                | setup/gateway docs                     | 无 full document e2e  | asyncapi/websocket          | 无                      | Partial  | 虚构 channel、数组 schema 偏差，且 production tree 引入重型 vulnerable generator。 |
| queue           | 全局 BullMQ root/QueueService              | `demo-queue` producer/processor/flow           | AppModule；test 排除 DemoQueue      | `queue.*`、Redis                | common/demo mocks                      | 无 Redis/worker       | queue                       | Redis/BullMQ            | Partial  | outage 请求无 deadline；真实 enqueue/process/retry/flow 未验证。                   |
| rate-limit      | APP_GUARD + tracker；trust proxy           | `demo-rate-limit`                              | AppModule + Demos                   | `rateLimit.*`                   | options/demo                           | HTTP slice            | security                    | 内存 store/proxy        | Partial  | stock guard 破坏 WS；tracker/proxy branches 未测；probe 未 skip。                  |
| schedule        | 全局 ScheduleModule/Service                | `demo-schedule`                                | AppModule + feature                 | `schedule.*`                    | fake timers/service/controller         | 无多实例              | schedule                    | timers/cron             | Partial  | 动态 timer 主路径受测；async callback、多实例、overview 标记有缺口。               |
| security/helmet | Helmet options + bootstrap                 | `demo-security`                                | configure + Demos                   | `NODE_ENV`                      | options/middleware/demo                | CSRF slice 间接经过   | demo/security               | HTTP                    | Complete | CSP/HSTS/dev 差异和顺序有测试。                                                    |
| sentry          | early instrument、global filter、isolation | sentry/queue/schedule/events/WS                | main + AppModule                    | `SENTRY_*`                      | isolation/demo/filter                  | 无真实 SDK            | sentry/demo                 | 可选 Sentry 网络        | Partial  | dotenv 时序、状态误报、真实 capture/flush/source-map 未验证。                      |
| serialization   | ClassSerializerInterceptor                 | `demo-serialization`                           | feature + Demos                     | 无                              | groups/nested/plain arrays             | 无独立 e2e            | serialization               | 无                      | Complete | 敏感/内部字段和分组行为有真实 interceptor slice。                                  |
| session         | express-session MemoryStore                | `demo-session`                                 | configure + Demos                   | `SESSION_*`                     | bootstrap/service/controller           | 无 cookie lifecycle   | project-notes/零散          | MemoryStore             | Partial  | production 主动拒绝是合理保护；无生产 store、专题或 e2e。                          |
| sse             | compression exemption                      | `demo-sse` 五类流                              | Demos                               | 无专属                          | controller；service 2/5 场景           | 无                    | project-notes               | 长连接/RxJS timers      | Partial  | 3/5 stream、断连/慢客户端/compression 行为未覆盖，缺专题。                         |
| streaming-files | feature HTTP adapter/StreamableFile        | `demo-streaming-files`                         | Demos                               | 无                              | service/controller                     | 无 artifact e2e       | demo                        | FS/streams              | Partial  | 源码环境受测；Docker 缺 README，公开 route 404。                                   |
| upload          | Multer pipes/storage                       | `demo-upload` multipart/chunked                | Demos                               | 常量限额/可注入 root            | 真实 HTTP+FS slice                     | 未走 global bootstrap | demo                        | tmp FS + Map            | Partial  | production 暴露、MIME fallback、finalize race、TTL/quota/cleanup 缺口。            |
| validation      | global/WS ValidationPipe                   | 全 DTO                                         | configure + WS gateway              | `NODE_ENV`                      | pipe/env/WS                            | WS invalid payload    | validation                  | class-validator         | Complete | whitelist/forbid/transform/error 稳定；文档仍有旧 DTO 引用。                       |
| websocket       | Demo adapter                               | authenticated gateway/rooms/filter/interceptor | configure + Demos + auth            | `JWT_*`                         | 各层直接 tests                         | 真实 Socket.IO slice  | websocket/asyncapi          | Socket.IO/JWT           | Partial  | slice 丰富但省略 rate-limit；真实 AppModule message path 失败，AsyncAPI 偏差。     |

能力矩阵状态汇总：**Complete 6、Partial 21、Missing 0、Not Applicable 0**。

## 6. 详细 Findings

### 6.1 Blocker

无。

### 6.2 High

### GNL-AUD-001 — Production 默认暴露完整 Demo 目录、固定身份签发链和危险操作面

- **ID：** `GNL-AUD-001`
- **标题：** Production 默认暴露完整 Demo 目录、固定身份签发链和危险操作面
- **类型：** Security / Architecture
- **维度：** D1、D3、D4、D5、D15
- **严重度：** High
- **置信度：** Confirmed
- **证据类型：** Inspected
- **位置：** `src/app.module.ts:21-50`；`src/examples/demos.module.ts:26-53`；`src/examples/demo-auth/demo-auth.controller.ts:38-63`；`src/examples/demo-auth/demo-auth.service.ts:19-28,72-105`；`src/examples/demo-database/demo-database.controller.ts:41-154`；`src/examples/demo-queue/demo-queue.controller.ts:27-73`；`src/examples/demo-schedule/demo-schedule.controller.ts:37-166`；`src/examples/demo-sentry/demo-sentry.controller.ts:24-26`；`docs/demo.md:80-90`。
- **现象：** `AppModule` 在 production 无条件导入 `DemosModule`。公开文档中的固定 Demo 登录身份可经 Local strategy 验证，并用当前运行时 `JWT_SECRET` 签发带管理员角色/权限的 JWT；数据库写删、queue pause/resume、schedule 控制、upload 和 Sentry debug 等接口没有真实认证/授权边界。
- **预期或判定依据：** 可移除教学 Demo 应在 production 默认关闭、显式 opt-in；管理、状态变更和诊断端点必须有真实认证授权。
- **影响：** 直接部署模板会同时公开固定身份签发链及数据、队列、调度、文件、诊断操作面；未来业务若复用相同 claims/key，权限影响进一步扩大。
- **根因：** Demo catalog 与生产应用无条件耦合，没有环境/config gate 或统一 Demo security boundary。
- **复现/验证方法：** 在隔离 production AppModule 中枚举路由；取得 CSRF token 后调用 Demo 登录，再调用代表性写接口。本次按边界未启动完整外部服务，但静态可达链完整。
- **最小修复建议：** production 默认不导入 `DemosModule`；仅在显式开发/演示配置下启用。若保留任何管理/诊断端点，增加真实 auth/authz。
- **建议补充测试：** production AppModule 中 Demo 路由为 404；显式启用时危险操作匿名请求为 401/403；固定 Demo 身份不能在 production 签发 token。
- **相关 finding：** `GNL-AUD-005`、`GNL-AUD-006`、`GNL-AUD-021`。

### GNL-AUD-002 — HTTP 访问日志记录 Authorization、Cookie 等认证材料

- **ID：** `GNL-AUD-002`
- **标题：** HTTP 访问日志记录 Authorization、Cookie 等认证材料
- **类型：** Security
- **维度：** D5、D13
- **严重度：** High
- **置信度：** Confirmed
- **证据类型：** Inspected + Executed
- **位置：** `src/common/logger/logger.config.ts:75-109`；`src/common/logger/logger.module.ts:7-14`；`src/main.ts:18-26`；`node_modules/pino-http/logger.js:27-35,138-168`；`node_modules/.pnpm/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/lib/req.js:65-93`。
- **现象：** Pino HTTP 配置没有 `redact` 或安全 request serializer。默认 serializer 复制全部 headers；`quietReqLogger:true` 只精简 `req.log`，自动 completion log/response logger 仍绑定完整 request。占位探针确认 `authorization` 和 `cookie` 被保留。
- **预期或判定依据：** bearer token、session/cookie、CSRF token、响应 `set-cookie` 不得进入普通访问日志。
- **影响：** 凭据会进入 stdout/集中日志；日志读取者可能在 token 有效期内重放，且秘密扩散到备份、告警和第三方日志平台。
- **根因：** logger 只配置级别、transport、autoLogging 和 quiet logger，没有敏感字段策略。
- **复现/验证方法：** 用非真实占位 bearer/cookie 经过当前 `pino-http` completion-log 路径并解析输出；本次已执行。
- **最小修复建议：** redact `req.headers.authorization`、`req.headers.cookie`、CSRF header、`res.headers["set-cookie"]`；更稳妥地只序列化 allowlist headers/path/method/request id。
- **建议补充测试：** 捕获 JSON log，断言敏感键和值均未出现；同时保留 method/path/status/request id。
- **相关 finding：** `GNL-AUD-028`。

### GNL-AUD-003 — 全局 HTTP ThrottlerGuard 破坏生产 WebSocket 消息

- **ID：** `GNL-AUD-003`
- **标题：** 全局 HTTP ThrottlerGuard 破坏生产 WebSocket 消息
- **类型：** Defect / Reliability / Test Gap
- **维度：** D2、D4、D10、D11
- **严重度：** High
- **置信度：** Confirmed
- **证据类型：** Inspected + Executed
- **位置：** `src/app.module.ts:40-49`；`src/common/rate-limit/rate-limit.module.ts:19-23`；`config/config.yaml:28-40`；`test/websocket.e2e-spec.ts:25-39`；`node_modules/@nestjs/throttler/dist/throttler.guard.js:102-147`；`node_modules/@nestjs/websockets/context/ws-context-creator.js:27-52`。
- **现象：** 默认启用的 stock `ThrottlerGuard` 以 `APP_GUARD` 注册，Nest 会把 global guards 应用于 WS subscriber。该 guard 无 transport 判断地 `switchToHttp()`，最终对 WS 参数调用 `res.header()`；只读 WS context 探针得到 `TypeError: res.header is not a function`。现有 WS e2e 省略 `CommonRateLimitModule`，因此错误绿灯。
- **预期或判定依据：** HTTP guard 应跳过 WS，或由 transport-aware/WS 专用 guard 按 socket tracker 限流。
- **影响：** 生产握手可能成功，但 ping、join、message 等业务消息失败，已声明的 WebSocket 能力不可用。
- **根因：** HTTP-only guard 被全局化；跨模块测试未复用真实 `AppModule`。
- **复现/验证方法：** 在隔离 Nest app 同时导入 rate-limit 与 WebSocket 模块，认证后发送任一 subscribed message；依赖级探针已确认错误点。
- **最小修复建议：** 按 `context.getType()` 分流；HTTP 使用 stock guard，WS 使用明确 tracker/header 语义的专用 guard，或暂时对 gateway skip 后补 WS 限流。
- **建议补充测试：** 真实组合下 connect/ping/join/message；HTTP 与 WS 分别命中各自限流；错误不泄露内部 TypeError。
- **相关 finding：** `GNL-AUD-021`、`GNL-AUD-025`。

### GNL-AUD-004 — Production migration 发现、镜像执行和 Compose 首次建库链路断裂

- **ID：** `GNL-AUD-004`
- **标题：** Production migration 发现、镜像执行和 Compose 首次建库链路断裂
- **类型：** Defect / Operational Gap
- **维度：** D2、D8、D9、D12、D14、D15
- **严重度：** High
- **置信度：** Confirmed
- **证据类型：** Executed + Inspected
- **位置：** `config/database.config.ts:4-7,38-40,55-61`；`nest-cli.json:6-20`；`Dockerfile:16-22`；`docker-compose.yml:3-34`；`README.md:52-62,85-98`；实际 `dist/src/migrations/1760000000000-CreateDemoTable.js`。
- **现象：** runtime/CLI 构建 glob 查找 `dist/migrations/*.js`，实际 SWC 输出为 `dist/src/migrations/*.js`，执行核对命中 0。Production 强制 `synchronize=false`；Docker/Compose 无 migration job；最终镜像不含源码 data source，仓库 migration script 也不是镜像内可执行部署入口。
- **预期或判定依据：** README 要求生产使用 migration，且 Compose 声称一条命令运行 app/MySQL/Redis；干净数据库必须在接流量前获得 schema。
- **影响：** fresh MySQL volume 不会创建 `demo` 表；app 和 DB ping 可能成功，数据库 API 首次调用才失败。仓库内没有可靠 production schema rollout 路径。
- **根因：** 构建保留 `src/` 前缀但 glob 未同步；交付设计只包含 build/start，没有 migration contract。
- **复现/验证方法：** `pnpm run build` 后比较 migration 实际路径与 glob；在可丢弃 MySQL 上做 up/down/up 和 fresh-volume smoke。
- **最小修复建议：** 对齐 glob；提供编译后 data source/migration 命令；以独立 deploy job/init step 先迁移再启动，避免多副本并发迁移。
- **建议补充测试：** build 后 glob 至少命中预期 migration；CI disposable MySQL 上 migration up/down/up；Compose clean-volume schema smoke。
- **相关 finding：** `GNL-AUD-019`、`GNL-AUD-021`。

### GNL-AUD-005 — 匿名分片上传无生命周期与全局配额，可持续耗尽内存和磁盘

- **ID：** `GNL-AUD-005`
- **标题：** 匿名分片上传无生命周期与全局配额，可持续耗尽内存和磁盘
- **类型：** Security / Reliability
- **维度：** D1、D5、D10、D15
- **严重度：** High
- **置信度：** Confirmed
- **证据类型：** Inspected
- **位置：** `src/examples/demo-upload/demo-upload.controller.ts:43-157`；`src/examples/demo-upload/demo-upload.service.ts:23-26,67-183`；`src/examples/demo-upload/demo-upload.storage.ts:21-87`；`src/examples/demo-upload/demo-upload.constants.ts:2-10`；`src/examples/demos.module.ts:23,52`；`docs/demo.md:681-688`。
- **现象：** controller 无认证；session 保存在无界 `Map`。放弃/失败会话没有 TTL/取消/清理器，成功完成文件也无删除生命周期；没有主体级或全局容量配额。每会话虽限制 20 MiB、200 chunks，但长期调用可无限累积。
- **预期或判定依据：** 文件入口需要 auth、主体/租户和全局配额、会话 TTL、取消、失败/关停清理及完成文件生命周期。
- **影响：** 远程客户端可取得公开 CSRF token 后长期创建 session/上传 chunks，最终耗尽实例磁盘和内存。IP 限流只限制速率，不限制累计量或分布式来源。
- **根因：** 教学型进程内/临时文件实现被 production 默认暴露，且省略持久化生命周期。
- **复现/验证方法：** 隔离环境循环创建不完成会话、部分上传，跨 TTL 窗口观察 Map/tmp 目录持续增长。
- **最小修复建议：** 首先 production 禁用 Demo；若保留，增加认证、owner、quota、TTL、cancel、后台清理和 durable/object storage policy。
- **建议补充测试：** expired/cancel/checksum failure 清理；per-subject/global quota；匿名 401/403；shutdown orphan cleanup。
- **相关 finding：** `GNL-AUD-001`、`GNL-AUD-008`、`GNL-AUD-009`。

### 6.3 Medium

### GNL-AUD-006 — Passport、手写 HTTP 与 WebSocket 的 JWT 验证策略不一致

- **ID：** `GNL-AUD-006`
- **标题：** Passport、手写 HTTP 与 WebSocket 的 JWT 验证策略不一致
- **类型：** Security
- **维度：** D3、D5
- **严重度：** Medium
- **置信度：** Confirmed
- **证据类型：** Inspected + Executed
- **位置：** `src/common/auth/auth.module.ts:20-34`；`src/common/auth/auth.guard.ts:34-48`；`src/common/auth/strategies/jwt.strategy.ts:11-31`；`src/examples/demo-websocket/demo-websocket.service.ts:66-79`。
- **现象：** Passport strategy 明确验证 issuer/audience；手写 guard 和 WS service 只调用 `verifyAsync(token)`。`signOptions` 不会自动成为 verify policy；未声明 `algorithms` 时同一对称 key 接受 HS 算法族。探针确认错误 issuer/audience 的 HS512 token 被直接 verify 路径接受。
- **预期或判定依据：** 所有 token consumer 应执行一致的签名、expiration、issuer、audience、algorithm 和 payload schema。
- **影响：** 共享 key、多 issuer/token 类型场景下，手写/WS 路径接受 Passport 拒绝的跨上下文 token。
- **根因：** 三条认证链没有共享 verification policy。
- **复现/验证方法：** 用同一审计 key 签发错误 claims/HS512 token，分别走三条 verifier。
- **最小修复建议：** 统一 verify options、锁定算法，并让 HTTP/WS 复用同一 verifier；运行时校验 payload。
- **建议补充测试：** wrong issuer/audience/algorithm、expired、missing sub 在三路径中一致拒绝。
- **相关 finding：** `GNL-AUD-001`、`GNL-AUD-020`。

### GNL-AUD-007 — Production secret 强度与 JWT 生命周期策略仅做存在性检查

- **ID：** `GNL-AUD-007`
- **标题：** Production secret 强度与 JWT 生命周期策略仅做存在性检查
- **类型：** Security / Configuration
- **维度：** D3、D5、D8
- **严重度：** Medium
- **置信度：** Confirmed
- **证据类型：** Inspected + Executed
- **位置：** `config/validation.ts:202-254,304-333`；`src/common/auth/auth.module.ts:20-34`；`src/common/csrf/csrf.service.ts:107-125`；`src/common/crypto/hmac-signature.service.ts:40-53`；`docker-compose.yml:22-25`。
- **现象：** production 只要求 JWT/HMAC/CSRF 字符串非空；不拒绝单字符、仓库已知占位值、空 issuer/audience 或极端 TTL。只读 validator 探针接受单字符秘密和 100 年 TTL。
- **预期或判定依据：** 宣称 production fail-closed 的模板应拒绝明显弱秘密和不合理 bearer 生命周期。
- **影响：** 误配置可导致离线爆破/伪造、弱 CSRF/HMAC 或近乎永久 token；Compose 占位值可通过 validator。
- **根因：** 只实现 type/presence validation，缺安全强度和跨字段策略。
- **复现/验证方法：** 用非真实审计占位值调用 `validate()`；比较合规与弱配置。
- **最小修复建议：** 设最小随机字节/长度、拒绝已知 placeholder、限制 TTL 格式/上限、issuer/audience 非空；生产用 secret manager。
- **建议补充测试：** 弱值、placeholder、空 claims、超长 TTL 拒绝；合规随机值接受。
- **相关 finding：** `GNL-AUD-006`、`GNL-AUD-017`、`GNL-AUD-018`。

### GNL-AUD-008 — 分片上传 finalize 无互斥和原子发布

- **ID：** `GNL-AUD-008`
- **标题：** 分片上传 finalize 无互斥和原子发布
- **类型：** Defect / Reliability
- **维度：** D2、D10
- **严重度：** Medium
- **置信度：** Confirmed
- **证据类型：** Inspected
- **位置：** `src/examples/demo-upload/demo-upload.service.ts:96-120,129-172`；`src/examples/demo-upload/demo-upload.storage.ts:36-73`；`src/examples/demo-upload/demo-upload.controller.spec.ts:230-345`。
- **现象：** 双 `complete()` 可同时通过 `isComplete` 并共同 truncate/append 同一目标；late chunk 可在 cleanup 后落盘成 orphan。assemble/cleanup 失败会留下 partial file，且状态/清理顺序使重试不安全。
- **预期或判定依据：** 同一 uploadId finalize 至多一次；finalizing 后拒绝 chunk；完成文件经 temp+checksum+atomic rename 发布；失败可恢复。
- **影响：** 文件损坏、内容交错、孤儿分片/partial final、客户端无法安全重试。
- **根因：** boolean state 无 `finalizing`/CAS/lock，直接写共享终态路径，状态和文件系统无事务边界。
- **复现/验证方法：** `Promise.all([complete(), complete()])`；complete-vs-last-chunk barrier；故障注入 append/clear。
- **最小修复建议：** 每 uploadId 状态机与互斥/CAS；唯一 temp file + atomic rename；明确 rollback/cleanup。
- **建议补充测试：** 双 finalize、chunk-vs-finalize、assemble/rename/cleanup fault、幂等 retry。
- **相关 finding：** `GNL-AUD-005`、`GNL-AUD-009`。

### GNL-AUD-009 — 图片类型校验在魔数失败时信任客户端 MIME

- **ID：** `GNL-AUD-009`
- **标题：** 图片类型校验在魔数失败时信任客户端 MIME
- **类型：** Security / Defect
- **维度：** D5、D10
- **严重度：** Medium
- **置信度：** Confirmed
- **证据类型：** Executed + Inspected
- **位置：** `src/examples/demo-upload/demo-upload.http.ts:35-45`；`src/examples/demo-upload/demo-upload.controller.spec.ts:96-107`；安装版 Nest `FileTypeValidator`。
- **现象：** `fallbackToMimetype:true` 在 magic bytes 不匹配/不可识别时信任 multipart 声明；纯文本 buffer + `image/png` 探针返回有效。现有 test 只测声明为 `text/plain`。
- **预期或判定依据：** 安全文件类型校验应 fail closed，不依赖客户端可控 MIME。
- **影响：** 若示例被复用到持久化、图像解码或发布链，非图片进入可信处理路径。
- **根因：** 不安全 fallback 及缺 spoof case。
- **复现/验证方法：** 发送文本 bytes，filename/Content-Type 声明 PNG。
- **最小修复建议：** 禁用 fallback；检测失败拒绝；需要时真正解码图片后接受。
- **建议补充测试：** spoofed JPEG/PNG、截断签名、多态文件、检测器异常。
- **相关 finding：** `GNL-AUD-005`、`GNL-AUD-008`。

### GNL-AUD-010 — startTransaction 失败时 QueryRunner 不会 release

- **ID：** `GNL-AUD-010`
- **标题：** `startTransaction()` 失败时 QueryRunner 不会 release
- **类型：** Defect / Reliability
- **维度：** D2、D9、D10
- **严重度：** Medium
- **置信度：** Confirmed
- **证据类型：** Inspected
- **位置：** `src/examples/demo-database/demo-database.service.ts:46-61`；`src/examples/demo-database/demo-database.service.spec.ts:290-321`。
- **现象：** `connect()`、`startTransaction()` 位于 `try/finally` 外；connect 成功而 startTransaction reject 时不会 release。现有 test 只覆盖 save 失败后的 rollback/release。
- **预期或判定依据：** 获取的 QueryRunner 在任何后续失败路径都必须释放。
- **影响：** DB 故障期连接池逐步泄漏，最终耗尽连接。
- **根因：** 资源取得后才建立 cleanup 边界。
- **复现/验证方法：** mock connect resolve、startTransaction reject，断言 release；真实 DB 做故障注入。
- **最小修复建议：** 优先 `dataSource.transaction()`；否则创建后立即进入 try/finally，按 active state rollback，始终 release。
- **建议补充测试：** connect/start/commit/rollback/release 各失败路径，确保不覆盖原始错误。
- **相关 finding：** `GNL-AUD-004`。

### GNL-AUD-011 — DemoCache 的 item index 是非原子 read-modify-write

- **ID：** `GNL-AUD-011`
- **标题：** DemoCache 的 item index 是非原子 read-modify-write
- **类型：** Defect / Reliability
- **维度：** D2、D10
- **严重度：** Medium
- **置信度：** Confirmed
- **证据类型：** Inspected
- **位置：** `src/examples/demo-cache/demo-cache.service.ts:17-24,33-45,77-80,89-111`；`config/config.yaml:5-6`；`docs/cache.md:42-46`。
- **现象：** 不同 key 并发 create 读取同一旧数组，最后写覆盖；create/remove 也可丢失或复活 index。item 与 index 是两次独立写，部分失败即漂移；`findAll` 只信 index。
- **预期或判定依据：** 并发变更后索引与 item 一致，失败要原子或可补偿。
- **影响：** 列表永久漏项、幽灵 index、删除/创建结果不稳定；默认 TTL 0 使漂移长期存在。
- **根因：** 用数组模拟集合且无 Redis atomic set/Lua/transaction。
- **复现/验证方法：** cache get/set 加 barrier 后并发 create/remove；注入第二次写失败。
- **最小修复建议：** Redis Set + transaction/Lua，或取消二级 index；定义补偿/自愈。
- **建议补充测试：** concurrent create/remove、partial failure、index recovery。
- **相关 finding：** `GNL-AUD-013`。

### GNL-AUD-012 — Redis 中断时 queue HTTP 操作没有有限 failure budget

- **ID：** `GNL-AUD-012`
- **标题：** Redis 中断时 queue HTTP 操作没有有限 failure budget
- **类型：** Reliability / Operational Gap
- **维度：** D10、D13
- **严重度：** Medium
- **置信度：** Probable
- **证据类型：** Inspected
- **位置：** `src/common/queue/queue.module.ts:19-25`；`src/common/queue/queue.service.ts:37-74`；`src/examples/demo-queue/demo-queue.service.ts`。
- **现象：** 非 test Redis 使用 `enableOfflineQueue:true`、`maxRetriesPerRequest:null`；HTTP producer/control 路径直接 await add/flow/count/pause/resume，无 deadline/cancellation。
- **预期或判定依据：** 面向 HTTP 的 producer/admin 命令应有有界重试/超时并返回 503/504；worker 可使用独立长期重连策略。
- **影响：** Redis 分区时请求长期占用连接/内存，离线命令持续堆积，依赖故障扩散到 Web 层。
- **根因：** worker 与 HTTP producer 共用 fail-slow 连接策略，service 无 deadline。
- **复现/验证方法：** 隔离环境启动后阻断 Redis，测 enqueue/count/pause 是否在预算内结束。
- **最小修复建议：** 分离 producer/worker connection；producer 设置 bounded retries/connect/command timeout，错误映射 503/504。
- **建议补充测试：** startup/runtime outage、request cancellation、reconnect、恢复后的 offline command 策略。
- **相关 finding：** `GNL-AUD-013`、`GNL-AUD-014`。

### GNL-AUD-013 — Readiness 未覆盖默认启用的 Redis cache/queue

- **ID：** `GNL-AUD-013`
- **标题：** Readiness 未覆盖默认启用的 Redis cache/queue
- **类型：** Reliability / Operational Gap
- **维度：** D10、D13、D15
- **严重度：** Medium
- **置信度：** Confirmed
- **证据类型：** Inspected
- **位置：** `src/common/health/health.controller.ts:36-43`；`src/common/cache/cache.module.ts:9-24`；`src/common/queue/queue.module.ts:9-43`；`src/examples/demos.module.ts:31-53`；`config/config.yaml:13-19`；`docs/health.md:34-57`。
- **现象：** AppModule 总是装配 Redis cache 和非 test BullMQ，queue 默认 enabled；`/health/ready` 只做 TypeORM ping。Redis 后续故障时仍 ready。
- **预期或判定依据：** README 将 Redis 7 列为运行要求；readiness 应反映接收流量必需的依赖，或明确实现降级模式。
- **影响：** 编排继续向无法提供 cache/queue 能力的实例送流量；故障诊断和摘流失真。
- **根因：** health dependency graph 未与实际装配同步。
- **复现/验证方法：** MySQL 正常时阻断 Redis，对比 ready 与 cache/queue 请求。
- **最小修复建议：** 增加有界 Redis ping，按能力 enabled 决定是否纳入；若非关键，显式实现并报告 degraded。
- **建议补充测试：** Redis up/down/slow、queue disabled、恢复矩阵。
- **相关 finding：** `GNL-AUD-011`、`GNL-AUD-012`、`GNL-AUD-027`。

### GNL-AUD-014 — Bootstrap 没有失败退出和 SIGTERM 优雅关停契约

- **ID：** `GNL-AUD-014`
- **标题：** Bootstrap 没有失败退出和 SIGTERM 优雅关停契约
- **类型：** Reliability / Operational Gap
- **维度：** D2、D10、D13、D14
- **严重度：** Medium
- **置信度：** Confirmed
- **证据类型：** Inspected
- **位置：** `src/main.ts:12-33`；`src/common/schedule/schedule.service.ts:25-43`；全仓 `enableShutdownHooks|SIGTERM|SIGINT|process.exitCode` 搜索。
- **现象：** 未 `app.enableShutdownHooks()`；catch 只记录，不关闭已创建 app、不设置非零 exit code。configure/listen 失败可遗留 DB/Redis/Bull/timer；SIGTERM 不接入 Nest lifecycle。
- **预期或判定依据：** 启动失败应 fail-fast、释放资源、non-zero；容器 SIGTERM 应有界 drain/close。
- **影响：** 发布失败可能挂住或显示成功退出；滚动发布中 queue/job/request/timer 被直接截断。
- **根因：** bootstrap 只处理日志，没有统一 app/signal lifecycle。
- **复现/验证方法：** 隔离 child process 制造 EADDRINUSE/configure failure 并看 exit/handles；发送 SIGTERM spy hooks。
- **最小修复建议：** listen 前 enable hooks；保留 app 引用；catch 安全 close 并设置 `process.exitCode=1`；定义 drain timeout。
- **建议补充测试：** child-process startup failure、SIGTERM/SIGINT、在途 queue/schedule/DB close。
- **相关 finding：** `GNL-AUD-012`、`GNL-AUD-013`、`GNL-AUD-021`。

### GNL-AUD-015 — Production dependency audit 有 58 项漏洞且 CI 无门禁

- **ID：** `GNL-AUD-015`
- **标题：** Production dependency audit 有 58 项漏洞且 CI 无门禁
- **类型：** Security / Operational Gap
- **维度：** D5、D14
- **严重度：** Medium
- **置信度：** Confirmed
- **证据类型：** Executed + Inspected
- **位置：** 命令 `pnpm audit --prod`（exit 1）；`package.json:32-75`；`pnpm-lock.yaml`；`.github/workflows/ci.yml:29-42`；`src/common/asyncapi/asyncapi.config.ts:30-67`。
- **现象：** 58 项（2 Critical、28 High、25 Moderate、3 Low）。Critical `jsonpath-plus@7.2.0` RCE 与 `tar@6.2.1` DoS/多条 High traversal 主要经 direct production dependency `nestjs-asyncapi` 的 generator 栈进入；另有 axios、typeorm、body-parser 等。
- **预期或判定依据：** 生产树不应长期保留可升级 Critical/High；纯文档 generator 不应无必要进入运行镜像。
- **影响：** 供应链门禁失败、镜像攻击面扩大、可信发布受阻。
- **根因：** 旧 AsyncAPI generator stack 为 production dependency；CI 无 audit/update/exception gate。
- **复现/验证方法：** `pnpm audit --prod`；`pnpm why jsonpath-plus tar axios typeorm body-parser --prod`。
- **最小修复建议：** 升级/替换 `nestjs-asyncapi`，将文档生成移至 dev/build；升级直接依赖；建立有审计例外期限的 CI gate。
- **建议补充测试：** production audit；production tree 不含 generator/tar；升级后 build/AsyncAPI/HTTP/TypeORM 回归。
- **相关 finding：** `GNL-AUD-025`、`GNL-AUD-034`。
- **可达性校准：** 当前 production 的 AsyncAPI setup 在生成文档前 return；未证明 RCE/tar sink 可由 HTTP 请求触发，因此不把包管理器 Critical 机械定为应用 Blocker/High。

### GNL-AUD-016 — Sentry 在 dotenv 前初始化，env-file 配置静默失效

- **ID：** `GNL-AUD-016`
- **标题：** Sentry 在 dotenv 前初始化，env-file 配置静默失效
- **类型：** Defect / Operational Gap
- **维度：** D8、D13、D15
- **严重度：** Medium
- **置信度：** Confirmed
- **证据类型：** Inspected
- **位置：** `src/main.ts:1-10`；`src/instrument.ts:4-22`；`src/app.module.ts:24-31`；`src/examples/demo-sentry/demo-sentry.service.ts:29-56`；`docs/configuration.md:28-52`；`docs/sentry.md:35-47`。
- **现象：** instrument 首先读 `process.env`，之后 AppModule/ConfigModule 才加载 `.env.<environment>`。仅写在 env file 的 DSN/enabled/sample rate 不参与 SDK init，但稍后状态 service 可通过 ConfigService 报告 hasDsn/enabled。
- **预期或判定依据：** 文档把 runtime env 和 `.env.*` 都声明为支持来源；SDK 实际状态与状态接口应一致。
- **影响：** 监控静默失效且状态误报，错误不会上报。
- **根因：** early instrumentation 与 Nest dotenv 加载没有共享 pre-bootstrap loader。
- **复现/验证方法：** 子进程仅通过 `.env.<env>` 提供审计占位 DSN，spy `Sentry.init` 并比较 status；不使用真实 DSN。
- **最小修复建议：** instrument 前按同一 precedence 加载 env，或明确只支持进程注入，并同步 validation/status/docs。
- **建议补充测试：** runtime env、env file、disabled、test、sample-rate invalid 的 child-process contract。
- **相关 finding：** `GNL-AUD-017`。

### GNL-AUD-017 — Env 配置面、tracked 模板、ignored local 文件和生产指南不一致

- **ID：** `GNL-AUD-017`
- **标题：** Env 配置面、tracked 模板、ignored local 文件和生产指南不一致
- **类型：** Documentation Mismatch / DX / Operational Gap
- **维度：** D5、D8、D12、D15
- **严重度：** Medium
- **置信度：** Confirmed
- **证据类型：** Executed + Inspected
- **位置：** `config/validation.ts:56-335`；`src/app.module.ts:24-31`；`.gitignore:41-46`；`.env.development/.env.test/.env.production`（仅键名）；`docs/configuration.md:9-49,64-171`；`src/bootstrap/configure-application.ts:68-73`；`README.md:64-98`。
- **现象：** validator 有 48 个 env 键，配置文档清单漏 20 个 CORS/compression/cookie/session/crypto 键；tracked env files 仅覆盖 13 键。指南将“secret -> `.env.*`”，却未提示三份 `.env.<env>` 已 tracked；gitignore 忽略 `.env.<env>.local`，但 ConfigModule 不加载它。普通 `start:prod` 所需的 CORS、secrets、session 决策也未形成完整 checklist。
- **预期或判定依据：** 配置文档、加载 precedence、tracked template 与 validator/consumer 必须一致，并明确 secret-safe destination。
- **影响：** 用户可能把真实 secret 写进 tracked 文件，或把 override 放进完全不读取的 local 文件；按 production guide 仍可能在 CORS/session validation 处启动失败。
- **根因：** 配置入口独立演化，没有生成式 key contract/precedence test。
- **复现/验证方法：** 比较 validator 属性、文档 code block、`git ls-files '.env*'`、gitignore 和 `envFilePath`；本次未输出任何值。
- **最小修复建议：** 提供完整、无真实 secret 的 `.env.example`/reference；明确 required/default/condition/consumer；统一加载 `.env.<env>.local` 或删除该约定；生产优先 process env/secret manager。
- **建议补充测试：** validator keys ↔ docs/template contract；env precedence；审计占位 production fixture 同时通过 validation/bootstrap decision。
- **相关 finding：** `GNL-AUD-007`、`GNL-AUD-016`。

### GNL-AUD-018 — Docker/Compose 默认未遵循最小权限和最小暴露面

- **ID：** `GNL-AUD-018`
- **标题：** Docker/Compose 默认未遵循最小权限和最小暴露面
- **类型：** Security / Operational Gap
- **维度：** D5、D14、D15
- **严重度：** Medium
- **置信度：** Probable
- **证据类型：** Inspected
- **位置：** `Dockerfile:2-22`；`docker-compose.yml:36-59`；`README.md:52-62`。
- **现象：** production stage 无 `USER`，继承基础镜像默认 root；MySQL/Redis 向宿主发布普通 ports，Redis 无认证，数据库使用公开示例凭据。服务间通信并不需要宿主端口。
- **预期或判定依据：** 网络服务应以非 root 运行；本地依赖默认仅 Compose network 可达或绑定 loopback；生产 secret/ACL 由外部注入。
- **影响：** 应用/依赖被利用后容器内权限更高；宿主防火墙允许时，同网段或宿主进程可访问 Redis/MySQL。
- **根因：** Compose 混合了开发便利和 production-mode 示例，缺运行用户/ownership/network hardening。
- **复现/验证方法：** Docker 可用后 inspect/runtime `id -u`，检查监听地址及未认证 Redis；本次 Docker CLI blocked。
- **最小修复建议：** 专用非 root 用户 + `COPY --chown`；移除依赖 host ports 或绑定 `127.0.0.1`；真实部署用 secrets、强凭据和 Redis ACL/TLS。
- **建议补充测试：** image UID 非 0；Compose policy 检查依赖不全接口发布；上传 tmp 路径仍可写。
- **相关 finding：** `GNL-AUD-007`、`GNL-AUD-004`、`GNL-AUD-021`。
- **反证：** README 明确示例值需替换，降低了误用概率，但没有改变默认端口/UID 事实。

### GNL-AUD-019 — Docker 最终镜像缺 README，公开 streaming 路由固定 404

- **ID：** `GNL-AUD-019`
- **标题：** Docker 最终镜像缺 README，公开 streaming 路由固定 404
- **类型：** Defect / Delivery Mismatch
- **维度：** D2、D12、D14
- **严重度：** Medium
- **置信度：** Confirmed
- **证据类型：** Inspected
- **位置：** `src/examples/demo-streaming-files/demo-streaming-files.service.ts:21,62-69,106-134`；`Dockerfile:16-22`；`docs/demo.md:690-721`；`src/examples/demo-streaming-files/demo-streaming-files.service.spec.ts:52-63`。
- **现象：** route 读取 `process.cwd()/README.md`，最终镜像只复制 manifests 与 `dist`。源码测试在 repo cwd 通过，掩盖镜像缺件；package-json route 仍可工作。
- **预期或判定依据：** 已公开且文档承诺的 route 在 production artifact 中应具备所需资产。
- **影响：** `/demo-streaming-files/project/readme` 在标准 Docker 部署稳定 ENOENT → 404。
- **根因：** 运行时资产未纳入 build/image contract。
- **复现/验证方法：** 对比 Docker COPY 与 service path；Docker 可用后 `test -f /app/README.md` 并请求 route。
- **最小修复建议：** 显式复制 README，或将 fixture 纳入 Nest assets/dist 并使用稳定资源根。
- **建议补充测试：** 对构建/镜像 artifact 运行两个 project-file route smoke。
- **相关 finding：** `GNL-AUD-004`、`GNL-AUD-021`。

### GNL-AUD-020 — 登录响应 expiresIn 与可配置 JWT 实际生命周期不一致

- **ID：** `GNL-AUD-020`
- **标题：** 登录响应 `expiresIn` 与可配置 JWT 实际生命周期不一致
- **类型：** Defect / API Contract
- **维度：** D2、D3、D11、D12
- **严重度：** Medium
- **置信度：** Confirmed
- **证据类型：** Inspected + Executed
- **位置：** `src/common/auth/auth.module.ts:20-33`；`src/examples/demo-auth/demo-auth.service.ts:95-105`；`src/examples/demo-auth/demo-auth.service.spec.ts:42-60`；`test/app.e2e-spec.ts:71-80`。
- **现象：** JWT sign 读取 `JWT_ACCESS_TOKEN_TTL`，response 永远返回 `15m`。真实模块探针配置 `1h` 后，token `exp-iat=3600`，response 仍为 `15m`；unit/e2e 固定默认值，反而固化缺陷。
- **预期或判定依据：** response 生命周期元数据必须来自同一配置源或真实 claims。
- **影响：** 客户端刷新/过期调度错误，API 契约误导。
- **根因：** TTL 同时存在于 JWT module config 和 Demo service 硬编码。
- **复现/验证方法：** 非默认 TTL 登录并 decode token，比较 response 与 `exp-iat`。
- **最小修复建议：** 单一 TTL provider/config，签发和 response 共用；或返回实际绝对 `expiresAt`。
- **建议补充测试：** 参数化默认/非默认 TTL，断言 response 与 claims 一致。
- **相关 finding：** `GNL-AUD-006`、`GNL-AUD-024`。

### GNL-AUD-021 — E2E 全是切片装配，已对真实 bootstrap/模块图产生假阳性

- **ID：** `GNL-AUD-021`
- **标题：** E2E 全是切片装配，已对真实 bootstrap/模块图产生假阳性
- **类型：** Test Gap / Operational Gap
- **维度：** D4、D9、D10、D11、D12、D14、D15
- **严重度：** Medium
- **置信度：** Confirmed
- **证据类型：** Inspected + Executed
- **位置：** `test/app.e2e-spec.ts:22-53`；`test/csrf.e2e-spec.ts:20-46`；`test/rate-limit.e2e-spec.ts:15-45`；`test/websocket.e2e-spec.ts:25-39`；`.github/workflows/ci.yml:11-42`；`src/examples/demos.module.ts:26-27`；`src/common/queue/queue.module.ts:7,17-24`。
- **现象：** 4 个 e2e 均自组 `TestingModule`，0 个导入 `AppModule`，仅 CSRF 调 `configureApplication`。app e2e 断言 `/`，真实 URI versioning 只暴露 `/v1`；WS e2e 漏 rate-limit，掩盖 `GNL-AUD-003`；rate-limit e2e 未应用 trust proxy。CI 无 MySQL/Redis、migration、container/artifact smoke。
- **预期或判定依据：** 快速 slice tests 可保留，但必须明确区分，并有 disposable dependencies 支持的 full-app/delivery integration。
- **影响：** 349 unit + 10 e2e 可在 production module conflict、migration、Redis/BullMQ、route/versioning、资产失败时全部绿色。
- **根因：** test 特殊分支被当作全部 e2e；CI 没有独立 integration/delivery job。
- **复现/验证方法：** 搜索 e2e imports/bootstrap；用真实 URI versioning introspect route；比较 WS/rate-limit 模块集合。
- **最小修复建议：** 新增 full AppModule integration job + disposable MySQL/Redis；另建 artifact/container smoke；测试名称明确 slice/full。
- **建议补充测试：** full bootstrap health/auth/WS；migration up/down/up；real repository/cache/BullMQ；trusted proxy；artifact assets。
- **相关 finding：** `GNL-AUD-003`、`GNL-AUD-004`、`GNL-AUD-013`、`GNL-AUD-019`。

### GNL-AUD-022 — “严格 TypeScript”声明与实际编译/ESLint 门禁不一致

- **ID：** `GNL-AUD-022`
- **标题：** “严格 TypeScript”声明与实际编译/ESLint 门禁不一致
- **类型：** Maintainability / Architecture
- **维度：** D6、D7
- **严重度：** Medium
- **置信度：** Confirmed
- **证据类型：** Inspected + Executed
- **位置：** `CLAUDE.md`/项目规则的 strict 声明；`tsconfig.json:20-24`；`eslint.config.mjs:28-34`；独立 tsc/lint 结果。
- **现象：** 未开启 `strict`，`noImplicitAny:false`、`strictBindCallApply:false`；`no-explicit-any` 关闭，floating/unsafe 仅 warning。当前源码显式 `any` 为 0 且 tsc/lint 通过，但规则不会阻止未来回归。
- **预期或判定依据：** 仓库宣称 strict 时，编译器和 CI 应机器化执行相同边界。
- **影响：** 维护者获得错误安全感；后续隐式 any/null/unsafe promise 回归可能不阻断 CI。
- **根因：** 文档规则与渐进式 TS/ESLint 配置未同步。
- **复现/验证方法：** 查看 effective tsconfig/eslint；加入临时内存示例验证门禁（本次未改文件）。
- **最小修复建议：** 分阶段开启 strict 子项并修复基线；将关键规则升为 error，或把文档改为准确现状。
- **建议补充测试：** CI `tsc` 已存在；增加 config contract/逐步 strict rollout。
- **相关 finding：** `GNL-AUD-039`。

### GNL-AUD-023 — 默认全局 CSRF 使多份可复制 mutation 示例直接失败

- **ID：** `GNL-AUD-023`
- **标题：** 默认全局 CSRF 使多份可复制 mutation 示例直接失败
- **类型：** Documentation Mismatch / DX
- **维度：** D4、D12、D15
- **严重度：** Medium
- **置信度：** Confirmed
- **证据类型：** Inspected + Executed
- **位置：** `docs/demo.md:56-114,209-268,311-487,501-688`；`docs/queue.md:38-82`；`docs/schedule.md:50-79`；`src/bootstrap/configure-application.ts:101-103`；`src/common/csrf/csrf.service.ts:151-185`；`test/csrf.e2e-spec.ts:54-82`。
- **现象：** `CSRF_ENABLED=true` 默认全局保护 unsafe methods；e2e 证明无 token POST 为 403。auth login、database、HTTP POST、events、queue、schedule 等示例直接 POST/PUT，没有统一 cookie-jar/token 前置；Swagger Try it out 也没有可发现 workflow。
- **预期或判定依据：** 文档示例应在默认配置可运行，或明确先取 token/维持 cookies/设置 header，或说明 bearer-only 模式如何关闭 CSRF。
- **影响：** 教学主路径第一步得到非预期 403，用户误判各 feature 损坏。
- **根因：** CSRF 作为单 feature 文档，未传播其“全局默认”性质。
- **复现/验证方法：** 真实 bootstrap 直接执行文档 login/mutation；再按 token flow 对比。
- **最小修复建议：** README/docs 顶部提供统一 cookie-jar recipe；所有 mutation 交叉引用；明确 pure bearer 配置。
- **建议补充测试：** 文档化 login→profile、queue/upload recipe 使用 shared bootstrap+CSRF。
- **相关 finding：** `GNL-AUD-024`、`GNL-AUD-026`。

### GNL-AUD-024 — OpenAPI 只有路由外壳，请求、认证和错误契约大量缺失

- **ID：** `GNL-AUD-024`
- **标题：** OpenAPI 只有路由外壳，请求、认证和错误契约大量缺失
- **类型：** Documentation Mismatch / API Contract Gap
- **维度：** D3、D4、D11、D12、D15
- **严重度：** Medium
- **置信度：** Confirmed
- **证据类型：** Executed + Inspected
- **位置：** `src/common/openapi/openapi.config.ts:8-29`；`nest-cli.json:5-21`；`docs/openapi.md:4-38`；全部 HTTP controllers/DTOs。
- **现象：** 无 Swagger CLI plugin；83 个 DTO 中仅 5 个有 `@ApiProperty` 且均为 WS；HTTP controller 0 个 `@Api*`。实测 `SignInDto`/session login schema 为 `properties:{}`，受 `JwtAuthGuard` 的 profile operation 无 `security`；全仓无 `@ApiResponse`。
- **预期或判定依据：** 被称为 HTTP API 文档的 `/docs` 至少应表达请求字段/required/约束、protected operations、主要成功/错误响应。
- **影响：** Swagger 无法指导构造请求，生成客户端/契约测试得到空模型，401/403/429/502 等不可发现。
- **根因：** 只调用 `createDocument`，没有 metadata generation 策略或 generated-document test。
- **复现/验证方法：** 最小真实 DemoAuth/DemoSession module 生成 OpenAPI 并检查 schema/security；本次已执行。
- **最小修复建议：** 选择 SWC 兼容的 decorators/plugin；为公开 DTO/operations/errors 建立契约；增加 bearer metadata。
- **建议补充测试：** semantic snapshot：body properties/required、security、status/error refs、version-neutral paths。
- **相关 finding：** `GNL-AUD-020`、`GNL-AUD-023`、`GNL-AUD-026`。

### GNL-AUD-025 — AsyncAPI 包含虚构 channel，数组响应 schema 与 runtime 不符

- **ID：** `GNL-AUD-025`
- **标题：** AsyncAPI 包含虚构 channel，数组响应 schema 与 runtime 不符
- **类型：** Documentation Mismatch / API Contract Defect
- **维度：** D10、D11、D12
- **严重度：** Medium
- **置信度：** Confirmed
- **证据类型：** Executed + Inspected
- **位置：** `src/examples/demo-websocket/demo-websocket.gateway.ts:95-119`；`src/examples/demo-websocket/demo-websocket-server-events.doc.ts:13-40`；`src/examples/demo-websocket/demo-websocket-exception.filter.ts:35`；`src/examples/demo-websocket/dto/demo-websocket-response.dto.ts:74-101`；`docs/asyncapi.md:20-48`。
- **现象：** runtime scenarios 返回 `DemoWebsocketScenarioDto[]`，generated payload ref 是单 object；doc-only provider 把 detail DTO 声明为 `demo-websocket.error.detail` send channel，但 runtime 从不 emit，detail 实际嵌于 exception errors。生成文档却被称为 source of truth。
- **预期或判定依据：** channel 必须真实可收发，message schema 与 runtime payload 一致。
- **影响：** consumer 订阅永不出现的 event，并按 object 而非 array 解码。
- **根因：** 以 fake operation 绕过库的 component/root-array 限制，未建立 runtime↔document contract。
- **复现/验证方法：** 生成 AsyncAPI（本次为 11 channels），检查 payload/channel；搜索 runtime emit 为 0。
- **最小修复建议：** 真实 wrapper DTO 或 schema factory 表达数组；删除 fake detail channel，只作为嵌套 component。
- **建议补充测试：** generated channel 与 gateway/filter emit/subscribe 集合对照；runtime samples 过 schema validation。
- **相关 finding：** `GNL-AUD-003`、`GNL-AUD-015`、`GNL-AUD-029`。

### GNL-AUD-026 — 五个已装配 Demo 没有可运行的用户文档

- **ID：** `GNL-AUD-026`
- **标题：** 五个已装配 Demo 没有可运行的用户文档
- **类型：** Documentation Mismatch / DX
- **维度：** D1、D12、D15
- **严重度：** Medium
- **置信度：** Confirmed
- **证据类型：** Inspected
- **位置：** `docs/project-notes.zh-en.md:41-64`；`docs/demo.md` 全文；`demo-authorization`、`demo-cookies`、`demo-cors`、`demo-session`、`demo-sse` controllers。
- **现象：** 上述五项仅在 project notes 有一句目录映射，没有 method/path/body/response、cookie/session/Origin、SSE 消费、认证/CSRF/错误前置；OpenAPI 又无法补足 schema。
- **预期或判定依据：** 已装配公开 Demo 必须可发现、理解并按默认配置正确运行，不要求每项重复两份文档。
- **影响：** 使用者必须读 controller/service/spec 才能学习，模板教学闭环不成立。
- **根因：** demo guide 只覆盖部分 feature，专题文档未补齐。
- **复现/验证方法：** 对照 DemosModule/controller route inventory 与全量 products docs 搜索。
- **最小修复建议：** 为五项增加精简章节/专题，至少入口、请求/响应、前置、生产限制、验证命令。
- **建议补充测试：** docs route inventory ↔ controllers；可复制 sample smoke。
- **相关 finding：** `GNL-AUD-023`、`GNL-AUD-024`。

### GNL-AUD-027 — 真实 liveness/readiness 未跳过全局限流

- **ID：** `GNL-AUD-027`
- **标题：** 真实 liveness/readiness 未跳过全局限流
- **类型：** Reliability / Documentation Mismatch
- **维度：** D10、D12、D13
- **严重度：** Medium
- **置信度：** Probable
- **证据类型：** Inspected
- **位置：** `src/common/health/health.controller.ts:11-43`；`src/common/rate-limit/rate-limit.module.ts:9-25`；`config/config.yaml:28-40`；`docs/security.md:158-172`；`docs/health.md:22-64`。
- **现象：** 安全指南要求 health skip named throttlers，Demo health 也演示 `@SkipThrottle()`；真正 `/health/live`、`/health/ready` 无 skip metadata，受默认 3/sec short budget。
- **预期或判定依据：** deployment probes 不应消费/共享用户 quota，也不应因 probe burst 返回 429。
- **影响：** 多个 orchestrator/LB probe 共用 source IP 并突发时可能被 429，造成误判不健康或重启。
- **根因：** 指导原则只落到 demo-rate-limit，未落真实 health，且无 full-app e2e。
- **复现/验证方法：** 真实 AppModule 同来源 1 秒请求 health >3 次；当前静态 metadata 已确认缺失。
- **最小修复建议：** health controller/class 对所有 named throttlers skip；文档明确 bypass。
- **建议补充测试：** health burst 仍返回 probe 状态；普通 route 继续 429。
- **相关 finding：** `GNL-AUD-003`、`GNL-AUD-013`、`GNL-AUD-021`。

### GNL-AUD-028 — `/health` 子串可由 query 或相似业务路径关闭 access log

- **ID：** `GNL-AUD-028`
- **标题：** `/health` 子串可由 query 或相似业务路径关闭 access log
- **类型：** Operational Gap / Security
- **维度：** D5、D13
- **严重度：** Medium
- **置信度：** Confirmed
- **证据类型：** Executed + Inspected
- **位置：** `src/common/logger/logger.config.ts:70-72,90-108`；`src/common/logger/logger.config.spec.ts:29-89`。
- **现象：** ignore predicate 使用完整 `req.url.includes('/health')`。探针确认 `/demo-auth/scenarios?probe=/health`、`/v1/orders/health-history` 都被忽略。
- **预期或判定依据：** 只过滤明确的 probe pathname，不允许客户端控制 query/相似名称抑制审计日志。
- **影响：** 攻击者可给请求附带 `/health` query 规避自动 request/response log，削弱事件调查。
- **根因：** 对 raw URL 做无边界 substring match。
- **复现/验证方法：** 直接调用构建后的 predicate；本次已执行四组路径。
- **最小修复建议：** 解析 pathname，严格匹配 `/health` 或 `/health/` prefix；不要看 query。
- **建议补充测试：** probe、query injection、similar path、encoded path 表驱动。
- **相关 finding：** `GNL-AUD-002`。

### 6.4 Low

### GNL-AUD-029 — Common/bootstrap 泄漏 Demo WebSocket 名称与契约

- **ID：** `GNL-AUD-029`
- **标题：** Common/bootstrap 泄漏 Demo WebSocket 名称与契约
- **类型：** Architecture
- **维度：** D1、D6
- **严重度：** Low
- **置信度：** Confirmed
- **证据类型：** Inspected
- **位置：** `src/common/websocket/demo-socket-io.adapter.ts:6-25`；`src/common/asyncapi/asyncapi.config.ts:39-53`；`src/bootstrap/configure-application.ts:10,16,42,112`。
- **现象：** common adapter 名称/默认 origin、AsyncAPI channel/path 和 bootstrap 无条件接入都硬编码 Demo 语义，虽没有 TypeScript `common → features` import。
- **预期或判定依据：** common 平台层应业务中立；可移除 Demo 不应要求修改 common/bootstrap 的 Demo-specific contract。
- **影响：** 删除/替换 DemoWebsocket 时需跨层清理，模板边界和复用性下降。
- **根因：** transport adapter/document setup 与具体示例契约未分层。
- **复现/验证方法：** 尝试从 `DemosModule` 删除 WebSocket feature，列出仍残留的 adapter/doc/bootstrap references。
- **最小修复建议：** 将 Demo adapter/channel metadata 放 feature；common 只保留可配置 transport primitive。
- **建议补充测试：** 不导入 WebSocket Demo 时 AppModule/bootstrap 无 Demo path/provider。
- **相关 finding：** `GNL-AUD-003`、`GNL-AUD-025`。

### GNL-AUD-030 — Database HTTP contract 直接复用 TypeORM entity

- **ID：** `GNL-AUD-030`
- **标题：** Database HTTP contract 直接复用 TypeORM entity
- **类型：** Architecture / Maintainability
- **维度：** D6、D12
- **严重度：** Low
- **置信度：** Confirmed
- **证据类型：** Inspected
- **位置：** `src/examples/demo-database/demo-database.controller.ts` 各 CRUD 返回类型；`src/examples/demo-database/dto/demo-page-response.dto.ts`；`src/examples/demo-database/entities/demo.entity.ts`。
- **现象：** controller/page DTO 直接公开 `Demo` entity。当前 entity 仅 id/name/description，无敏感字段，尚未形成直接泄漏。
- **预期或判定依据：** ORM persistence model 与 public response contract 应可独立演化。
- **影响：** 未来新增内部/敏感 column 时可能被自动暴露，schema migration 与 API 形成不必要耦合。
- **根因：** 示例为简化 CRUD 省略 response DTO mapping。
- **复现/验证方法：** 追踪 controller/service return types 至 repository entity。
- **最小修复建议：** 定义稳定 response DTO，在 service/controller boundary 明确构造；当前无需领域层大重构。
- **建议补充测试：** response 不含新增内部字段；OpenAPI 引用 response DTO。
- **相关 finding：** `GNL-AUD-024`。

### GNL-AUD-031 — HttpCacheInterceptor 已注册/导出但没有运行时 consumer

- **ID：** `GNL-AUD-031`
- **标题：** `HttpCacheInterceptor` 已注册/导出但没有运行时 consumer
- **类型：** Completeness / Maintainability
- **维度：** D1、D6
- **严重度：** Low
- **置信度：** Confirmed
- **证据类型：** Inspected
- **位置：** `src/common/cache/cache.module.ts:7,22-23`；`src/common/cache/http-cache.interceptor.ts`；`docs/cache.md:42-46`；全仓 consumer 搜索。
- **现象：** interceptor 被 provider/export、具备 unit tests，文档也诚实说明未 mount，但没有 controller/global consumer；response-cache 子能力不可观察。
- **预期或判定依据：** 模板声称的能力应有可运行 consumer，或不把未接入 provider 当已完成示例。
- **影响：** 使用者无法从 Demo 验证 vary/key/cache header 行为；dead surface 增加维护成本。
- **根因：** cache CRUD Demo 与 HTTP response cache 示例未闭环。
- **复现/验证方法：** 搜索 `UseInterceptors(HttpCacheInterceptor)`/APP_INTERCEPTOR，结果为 0。
- **最小修复建议：** 增加安全的 GET Demo consumer，或删除/明确标为 library primitive。
- **建议补充测试：** HTTP GET hit/miss、Authorization/Tenant vary、non-GET skip。
- **相关 finding：** `GNL-AUD-011`。

### GNL-AUD-032 — 外部 HTTP response 只有 TypeScript 泛型，没有运行时契约校验

- **ID：** `GNL-AUD-032`
- **标题：** 外部 HTTP response 只有 TypeScript 泛型，没有运行时契约校验
- **类型：** Reliability / API Contract Gap
- **维度：** D2、D10、D12
- **严重度：** Low
- **置信度：** Confirmed
- **证据类型：** Inspected
- **位置：** `src/examples/demo-http/demo-http.service.ts:65-89,114-124`；相关 response DTO/spec。
- **现象：** `HttpService.get/post<T>` 的 upstream `data` 直接当 DTO 返回；缺字段/错类型仍 2xx 传播。
- **预期或判定依据：** 不可信 integration boundary 应 runtime validate，并把契约异常映射为稳定 502。
- **影响：** 外部 API 漂移会越过本地类型系统，破坏下游 API contract。
- **根因：** 把 compile-time generic 当 runtime validation。
- **复现/验证方法：** mock upstream 返回 `{unexpected:true}`，当前 service 接受。
- **最小修复建议：** 用现有 class-validator/class-transformer 或 schema 校验 response；失败返回受控 Bad Gateway。
- **建议补充测试：** missing/wrong type/oversized/non-JSON response。
- **相关 finding：** `GNL-AUD-024`。

### GNL-AUD-033 — 动态 interval/timeout 在 overview 中始终标记 unmanaged

- **ID：** `GNL-AUD-033`
- **标题：** 动态 interval/timeout 在 overview 中始终标记 `managed:false`
- **类型：** Defect
- **维度：** D2、D7
- **严重度：** Low
- **置信度：** Confirmed
- **证据类型：** Inspected
- **位置：** `src/common/schedule/schedule.service.ts:80-93,257-269`。
- **现象：** timer DTO 构造硬编码 `managed:false`，忽略 `managedIntervals/managedTimeouts`，由该 service 注册的 timer 也被错报。
- **预期或判定依据：** overview 应准确表达 ownership/cleanup responsibility。
- **影响：** 运维/教学输出误导，可能错误判断资源清理责任。
- **根因：** DTO helper 未接收 timer kind/managed set。
- **复现/验证方法：** registerInterval/registerTimeout 后 list/overview。
- **最小修复建议：** 根据 kind 查询对应 managed Set。
- **建议补充测试：** 注册、删除、shutdown 前后 managed 状态。
- **相关 finding：** `GNL-AUD-014`。

### GNL-AUD-034 — 实际登录入口缺 credential-specific 限流且密码无最大长度

- **ID：** `GNL-AUD-034`
- **标题：** 实际登录入口缺 credential-specific 限流且密码无最大长度
- **类型：** Security / Documentation Mismatch
- **维度：** D3、D4、D5
- **严重度：** Low
- **置信度：** Confirmed
- **证据类型：** Inspected
- **位置：** `docs/security.md:155-166`；`src/examples/demo-auth/demo-auth.controller.ts:44-55`；`src/examples/demo-auth/dto/sign-in.dto.ts:4-11`；`src/common/auth/password-hash.service.ts:24-37`。
- **现象：** security guide 要求 login/token issuance 使用专用 `@Throttle()`；实际 auth login 仅全局预算。Password DTO 只有最小长度，guard 在 controller pipe 前进入 scrypt。
- **预期或判定依据：** credential endpoint 应有更严格尝试预算和输入长度边界。
- **影响：** 增加在线猜测与超长 scrypt 输入的 CPU 面；多实例内存限流进一步放大预算。
- **根因：** rate-limit Demo 与真实 auth Demo 没有交叉接入。
- **复现/验证方法：** 隔离 app 重复错误 login；超长 password spy hash verify。
- **最小修复建议：** login 使用命名 throttle；strategy 前验证类型/max length。
- **建议补充测试：** credential-specific 429；超长值不得调用 verify。
- **相关 finding：** `GNL-AUD-001`、`GNL-AUD-027`。

### GNL-AUD-035 — Coverage 无阈值且不在 CI 执行

- **ID：** `GNL-AUD-035`
- **标题：** Coverage 无阈值且不在 CI 执行
- **类型：** Test Gap
- **维度：** D11、D14
- **严重度：** Low
- **置信度：** Confirmed
- **证据类型：** Executed + Inspected
- **位置：** `package.json:114-138`；`.github/workflows/ci.yml:29-42`；有效 coverage 输出。
- **现象：** Jest 没有 `coverageThreshold`，CI 不跑 `test:cov`。Branches 44.82%；main/instrument/repl/TypeORM CLI/migration 为零执行覆盖。
- **预期或判定依据：** 覆盖退化与关键安全/启动文件最低门槛应产生自动信号；不要求凭空设高阈值。
- **影响：** 测试资产可持续退化而不阻断 CI。
- **根因：** coverage 仅为人工命令。
- **复现/验证方法：** 查看 Jest/CI；执行 `test:cov`。
- **最小修复建议：** CI 跑 coverage；以当前稳定基线做渐进阈值，关键模块可单文件约束。
- **建议补充测试：** 优先 rate tracker、auth config、bootstrap、migration/CLI。
- **相关 finding：** `GNL-AUD-021`。

### GNL-AUD-036 — SWC production artifact 携带全部单测 JS 和内嵌源码 map

- **ID：** `GNL-AUD-036`
- **标题：** SWC production artifact 携带全部单测 JS 和内嵌源码 map
- **类型：** Operational Gap / Maintainability
- **维度：** D13、D14
- **严重度：** Low
- **置信度：** Confirmed
- **证据类型：** Executed + Inspected
- **位置：** `nest-cli.json:5-20`；`tsconfig.build.json:1-4`；`.swcrc`；`Dockerfile:20`；实际 `dist/`。
- **现象：** 实际产物有 84 个 `*.spec.js`、84 个 spec map、322 个 maps；map 含 `sourcesContent`。Docker 复制整个 dist。
- **预期或判定依据：** production artifact 只含运行所需代码；source maps 有明确 upload/retain/strip policy。
- **影响：** 镜像约 1.18 MB 无用测试产物并暴露内部 test/source 内容。
- **根因：** Nest SWC filenames 范围未遵循预期 spec exclude，镜像无 pruning。
- **复现/验证方法：** build 后 `find dist -name '*.spec.js'`/`*.map` 统计。
- **最小修复建议：** 修正实际 SWC/Nest exclude；决定 source-map 上传后剥离或受控保留。
- **建议补充测试：** artifact contract 禁止 specs，保留 main/config/entity/migration。
- **相关 finding：** `GNL-AUD-015`、`GNL-AUD-021`。

### GNL-AUD-037 — 两份指南仍引用已删除的 FindDemoParamsDto

- **ID：** `GNL-AUD-037`
- **标题：** 两份指南仍引用已删除的 `FindDemoParamsDto`
- **类型：** Documentation Mismatch
- **维度：** D7、D12、D15
- **严重度：** Low
- **置信度：** Confirmed
- **证据类型：** Inspected
- **位置：** `docs/demo.md:319-324`；`docs/validation.md:75-83`；`src/examples/demo-database/demo-database.controller.ts:94-130`。
- **现象：** docs 指向不存在的 `find-demo-params.dto.ts` 并称 `@IsNumberString()` 是当前模式；实现已改为 `ParseArrayPipe`/`ParseIntPipe`/`ParseUUIDPipe`。
- **预期或判定依据：** “Key files/current patterns” 应引用现存实现。
- **影响：** 用户找不到文件并按旧模式扩展，降低文档可信度。
- **根因：** DTO 重构后未同步两份文档。
- **复现/验证方法：** 第一方 path/symbol existence check。
- **最小修复建议：** 改为当前 primitive pipes 示例。
- **建议补充测试：** Markdown 中第一方 backtick path/symbol lint。
- **相关 finding：** `GNL-AUD-026`。

### GNL-AUD-038 — 文档/根配置 Prettier 检查失败且 CI 不保护该范围

- **ID：** `GNL-AUD-038`
- **标题：** 文档/根配置 Prettier 检查失败且 CI 不保护该范围
- **类型：** Maintainability / Documentation Mismatch
- **维度：** D7、D12、D14
- **严重度：** Low
- **置信度：** Confirmed
- **证据类型：** Executed + Inspected
- **位置：** 必需 Prettier check 命令；`package.json:10,16-17`；`.github/workflows/ci.yml:29-42`。
- **现象：** 9 files fail；当前产品/交付相关为 `docs/asyncapi.md`、`docs/health.md`、`docs/security.md`、`docs/validation.md`、`docker-compose.yml`、`pnpm-lock.yaml`、`tsconfig.compodoc.json`。TS/config/test 专项通过；history audit/prompt 不计产品缺陷。
- **预期或判定依据：** 仓库采用 Prettier 时，产品文档/root config 应有明确只读 check scope。
- **影响：** 格式漂移和 review noise 持续积累；不是运行阻断。
- **根因：** format/CI 只覆盖 TS。
- **复现/验证方法：** 运行第 3 节命令，exit 1。
- **最小修复建议：** 经授权格式化；新增 `format:check`，明确 lockfile 是否纳入。
- **建议补充测试：** CI Prettier check。
- **相关 finding：** `GNL-AUD-039`。

### GNL-AUD-039 — 机械中英注释与命名违反仓库明确规则

- **ID：** `GNL-AUD-039`
- **标题：** 机械中英注释与命名违反仓库明确规则
- **类型：** Maintainability / Documentation Quality
- **维度：** D7、D12、D15
- **严重度：** Low
- **置信度：** Confirmed
- **证据类型：** Inspected
- **位置：** 约 10,116 non-spec LOC 中 681 行 CN/EN、53 处 `AI modified:`、约 229 个 non-spec 文件含模板注释；README + 16 产品 docs 均有同构 banner；`config/validation.ts:21-54` 的 `parse*`/`normalizedValue`，以及若干 `normalize*` helper。
- **现象：** 大量“文件支持实现/执行 X 业务逻辑”不解释 why；文档首屏重复“文档说明 X 用途”；部分 helper 名称违反项目对仅做字段/字符串处理时的 `normalize/parse/...` 禁令。
- **预期或判定依据：** AGENTS 明确要求 AI comment 解释原因、禁止无意义注释，并规定命名。
- **影响：** 信息密度下降、真实约束被噪声掩盖，规则可信度降低。
- **根因：** 批量生成模板优先于语义审阅。
- **复现/验证方法：** `rg 'AI modified:|CN:|EN:|normalize|parse'`，人工区分合法业务语义与机械 mapping。
- **最小修复建议：** 分批删除同义/机械注释；只保留 why；按明确命名规则调整真正违规项，避免大范围无关重写。
- **建议补充测试：** 可选 lint 检查 tautological banners/禁用命名；主要依靠 code review。
- **相关 finding：** `GNL-AUD-022`、`GNL-AUD-038`。

### 6.5 Info

### GNL-AUD-040 — Node 24 要求未通过 package engines 表达

- **ID：** `GNL-AUD-040`
- **标题：** Node 24 要求未通过 package `engines` 表达
- **类型：** DX
- **维度：** D14、D15
- **严重度：** Info
- **置信度：** Confirmed
- **证据类型：** Executed + Inspected
- **位置：** `package.json:2-7,140`；`README.md:11-16`；`Dockerfile:2-6`；`.github/workflows/ci.yml:18-27`。
- **现象：** README、Docker、CI 一致使用 Node 24，packageManager 固定 pnpm 11.1.2，但 package 无 `engines`。
- **预期或判定依据：** 明确依赖特定 Node 大版本时，安装入口宜提供机器可读范围。
- **影响：** 本地不兼容 Node 只能在较晚阶段发现。
- **根因：** 运行时要求只在文档/CI/容器表达。
- **复现/验证方法：** 读取 package metadata，`engines` 缺失。
- **最小修复建议：** 添加与真实支持范围一致的 `engines.node`；是否严格 enforcement 由维护者决定。
- **建议补充测试：** package metadata contract。
- **相关 finding：** 无。

### 6.6 Accepted Design

以下不计入确认缺陷数量：

1. **生产拒绝 MemoryStore：** `Inspected`：`configureApplication` 在 production + `SESSION_ENABLED=true` 时明确失败。未提供 production session store 是已声明模板边界；问题在于生产配置指南不完整，已归 `GNL-AUD-017`。
2. **OpenAPI/AsyncAPI production 关闭：** `Inspected`：setup 在文档生成前 return，减少生产暴露；契约内容缺陷另归 `GNL-AUD-024/025`。
3. **Liveness 只检查进程：** `Inspected`：这是正确 probe 设计；Redis 缺失仅针对 readiness，归 `GNL-AUD-013`。
4. **Queue test 特殊分支：** `Inspected`：lazy/manual registration 和 test 排除避免单测误连 Redis是合理隔离；把它当完整 e2e 才是 `GNL-AUD-021`。
5. **SSE/streaming 基础资源处理：** `Inspected`：Nest SSE 使用串行写/drain，request close unsubscribe；业务 timer finalize 清理，event-stream 免压缩；streaming 使用 stream/固定 allowlist path，未见 traversal/整体读入内存。
6. **Express/Multer/Socket.IO 类型出现在协议适配职责中：** 当前 consumer 是明确 transport Demo，未认定为 service 分层缺陷。
7. **Source maps 本身：** 对 Sentry 调试有价值；问题只是 production policy 未明确且 specs 一并进入 artifact，归 `GNL-AUD-036`。
8. **`private:true`、`UNLICENSED`、空 author/description：** 对不发布 npm 的服务模板可接受，不单列缺陷。
9. **当前 entity 无 relation：** `Relation<T>` 不适用；entity 与 migration 的字段/长度/非空/主键一致。
10. **无 common→features import、无 sibling feature deep import、无 runtime value cycle：** 已明确检查；WS 中 type-only source cycle 当前未产生 runtime defect。

### 6.7 Environment Blockers

以下不计入确认缺陷数量：

1. **Docker 工具不可用：** `Executed`：`docker compose config --quiet` exit 127。限制了 Compose schema、image build/run、UID、文件权限、实际 assets、ports 与 healthcheck 验证。
2. **无隔离 MySQL/Redis：** `Assumed/Policy`：提示词要求只有在用户提供并确认可丢弃环境后才启动。限制了 full AppModule、migration、repository/cache/BullMQ、readiness outage 结论。
3. **首次 coverage 沙箱监听 EPERM：** `Executed`：Environment blocker；授权重跑已通过，因此不限制 coverage 总结。
4. **临时网络/工具调用：** audit JSON/filter 的补充网络重试失败、错误 coverage summary 文件名、文档 probe preload 错误均已纠正；不计项目失败，也不限制有效主证据。

### 6.8 Needs Verification

以下不进入确认缺陷数量：

1. **真实数据库：** migration up/down、事务隔离、并发 update、索引/LIKE 负载、权限最小化。
2. **真实 Redis/BullMQ：** outage/reconnect/offline queue、stalled/duplicate/retry、flow、worker drain、多实例。
3. **完整 production AppModule：** 启动资源、路由、guard/filter 顺序、关停、startup failure exit。
4. **Docker/Compose：** image build/run、fresh volume、实际 UID、read-only FS/可写 tmp、dependency ports、healthcheck。
5. **Upload：** 高并发 finalize、容量/慢速请求、多实例、清理时钟、DoS 增长率。
6. **WebSocket：** room membership/ACL 是否要求 sender 已 join；token expiry/revocation；async connect/disconnect race；多实例 adapter。
7. **Schedule：** async callback 目前可被 TS 的 `() => void` 接受，但 wrapper 不 await/catch，可能产生 overlap/unhandled rejection；当前 consumer 同步，因此列为待验证/设计决策。
8. **SSE/streaming：** 慢客户端、断连、长时间背压、容器级 route smoke。
9. **反向代理：** `trust proxy=loopback` 是否匹配实际 ingress；forwarded header 不能仅靠当前 slice test 证明。
10. **Sentry：** 真实 DSN、event scrub/flush、后台 isolation、source-map upload/dashboard。
11. **依赖漏洞：** `jsonpath-plus`/tar 等 sink 的远程利用性；当前只确认 production tree 和 advisory，不声称 PoC exploit。
12. **API 文档：** 完整 AppModule Swagger UI、全量约百个 operation、browser cookie/CSRF Try it out；本次只用真实最小模块证明系统性 metadata 缺口。
13. **性能：** 无 sustained load、mutation、fuzz、DAST、container/SBOM/license scan；不声称具体吞吐/延迟退化幅度。

## 7. 测试与 Coverage 分析

### 7.1 实际执行结果

- **Unit：** `Executed`，84 suites / 349 tests / 0 snapshots，全通过。
- **Coverage：** `Executed`，有效授权重跑覆盖同一 84/349：
  - Statements：83.43%
  - Branches：44.82%
  - Functions：92.75%
  - Lines：85.79%
- **E2E：** `Executed`，4 suites / 10 tests，全通过：
  - `test/app.e2e-spec.ts`：3 tests
  - `test/csrf.e2e-spec.ts`：1 test
  - `test/rate-limit.e2e-spec.ts`：3 tests
  - `test/websocket.e2e-spec.ts`：3 tests
- **分类：**
  - 纯 unit/TestingModule tests：84 suites；
  - HTTP/WS slice e2e：4 suites；
  - 完整 `AppModule` e2e：0；
  - 真实 MySQL/Redis integration：0。

### 7.2 Coverage 质量而非只看总值

关键低覆盖/零覆盖：

- `src/main.ts`、`src/instrument.ts`、`src/repl.ts`：0；启动、Sentry 时序、退出路径完全依赖静态检查。
- `src/common/rate-limit/rate-limit.config.ts`：约 38.1% statements、0% branches、50% functions；`getClientIp`/proxy fallback 未执行。
- `src/common/auth/auth.module.ts`：约 79.2% statements、23.8% branches；非默认 TTL/issuer/audience 未被常规 suite 保护。
- rate-limit/schedule/SSE/error branches 显著低于总 statements；SSE 仅主要执行 notification/job-progress，其他场景、断连和慢客户端不足。
- `config/typeorm.data-source.ts`、唯一 migration：0；production artifact/migration contract 无测试执行。
- bootstrap compression filter 的 event-stream 分支未真实调用。
- coverage 没有 threshold，也不在 CI，见 `GNL-AUD-035`。

### 7.3 源码—spec 配对与断言质量

`Inspected`：

- 非平凡 controller/service/guard/strategy/filter/pipe/interceptor/adapter/gateway/processor/listener 大多有同名或等价行为测试。
- events listener/log、serialization service、upload service/storage 虽无全部同名 spec，但被真实 EventEmitter/interceptor/HTTP+FS slice 覆盖，不误判为“无测试”。
- 测试普遍断言结构、依赖调用或错误类型，不只是 `toBeDefined()`。
- 已有 400/401/403/404/429、413/422、DB rollback、queue disabled/unknown job、HTTP timeout/error mapping、CSRF、WS validation/filter 基础。
- 所有检出的 `.resolves/.rejects` 均被 await；未发现明显永真断言或遗失 Promise。
- Nest app/module、WS clients、fake timers、临时目录、修改过的 env 有清理逻辑。

主要配对/失败路径缺口：

- upload 缺双 finalize、chunk-vs-complete、unknown/repeated complete、checksum/assemble/cleanup fault 和 TTL/quota。
- DB 缺 startTransaction/commit/rollback/release 全 failure matrix。
- cache 缺真实 Redis 和并发 index/partial write。
- queue 只有 mocks，无真实 worker/storage/retry/flow/outage。
- auth 缺 non-default TTL 和三 verifier 一致性。
- health 缺 Redis matrix、burst bypass、真实 indicator。
- 无 500 级 full e2e；多数错误映射停留 unit/slice。

### 7.4 假阳性与 Mock 风险

最重要的三个错误绿灯：

1. WS e2e 省略 rate-limit，导致 `GNL-AUD-003` 在 3 个通过测试后仍存在；
2. app e2e 不调用 versioning/bootstrap，断言真实运行时不存在的 `GET /`；
3. streaming tests 依赖 repo cwd 的 README，无法发现 Docker 资产缺失。

此外：

- `NODE_ENV=test` 排除 DemoQueueModule并手动/lazy Bull 注册，是合理 unit isolation，但不能证明 production module graph；
- DB repository/DataSource、Redis cache、BullMQ 大量 mock 正确隔离了 unit boundary，却不能冒充 integration；
- rate-limit e2e 配置 `trustProxy` 但不调用 bootstrap，因此该设置并未实际应用；
- CSRF e2e 是唯一调用共享 `configureApplication` 的 e2e，但仍是 feature slice。

### 7.5 Flaky 与资源风险

- 当前 suite 未发现残留 handle/timer；有效执行稳定通过。
- WebSocket helper 使用 1–1.5 秒固定 timeout，在慢 CI 可能 flaky，尚未复现。
- upload 使用固定 temp root 但测试逐例清理；并行/崩溃残留仍需压力/故障测试。
- coverage 首次 `EPERM` 是当前沙箱监听限制，不是测试不稳定；授权环境有效通过。

## 8. 代码、配置、API 与文档不一致项

| 声明来源                                            | 实际实现/产物                                                | 哪一方可能过时        | 用户影响                                 | 修正建议                                             |
| --------------------------------------------------- | ------------------------------------------------------------ | --------------------- | ---------------------------------------- | ---------------------------------------------------- |
| README/规则称 strict TypeScript                     | `strict` 未启用，若干安全规则为 off/warn                     | 配置或文档            | CI 不阻断类型回归                        | 逐步开启 strict，或准确改写声明。                    |
| `JWT_ACCESS_TOKEN_TTL` 可配置                       | 登录 response 固定 `15m`                                     | Demo service/tests    | 客户端过期调度错误                       | 共用 TTL source，参数化 contract test。              |
| app e2e 断言 `GET /`                                | 真实 default URI versioning 仅 `GET /v1`                     | 测试/公共 API 决策    | smoke 给出错误契约                       | 决定 neutral 或 v1，再让 e2e 走 shared bootstrap。   |
| Runtime migration glob `dist/migrations/*.js`       | build 输出 `dist/src/migrations/*.js`                        | 配置                  | production 找不到 migration              | 对齐 glob + artifact test。                          |
| README/Compose 一步运行 + production migration 原则 | image/compose 无 migration step，clean volume 无 schema      | 交付文档/实现         | DB Demo 运行时失败                       | 独立 migration job + fresh-volume smoke。            |
| Streaming docs 承诺 README route                    | production image 不复制 README                               | Dockerfile            | 容器 route 404                           | 打包显式 asset。                                     |
| `.env.*` 被文档称为受支持 Sentry 来源               | instrument 在 ConfigModule dotenv 前读取                     | instrument/docs       | Sentry 静默未初始化且 status 误报        | 共享 pre-bootstrap env loader 或只支持 process env。 |
| 配置指南 Env/YAML “Current Values”                  | 漏 20 env keys 和全部 rateLimit YAML                         | 文档                  | production 仍因 CORS/session/secret 失败 | 自动生成/contract-check 完整 reference。             |
| 文档建议 secret 放 `.env.*`                         | 三份 `.env.<env>` tracked；ignored `.env.<env>.local` 不加载 | 文档/loader/gitignore | secret 误提交或 override 无效            | 统一 tracked template 与 local precedence。          |
| 多份 POST/PUT 示例可直接复制                        | 默认全局 CSRF 先返回 403                                     | 文档                  | 教学步骤失败                             | 统一 cookie-jar/token 前置。                         |
| `/docs` 被称为 HTTP API 文档                        | HTTP DTO schema 大量 `{}`，protected operation 无 security   | OpenAPI metadata      | Swagger/客户端生成不可用                 | decorators/plugin + generated contract tests。       |
| AsyncAPI 被称为 source of truth                     | 虚构 detail channel；scenario array 声明 object              | doc provider/schema   | consumer 订阅/解码错误                   | 删除 fake operation，准确 wrapper schema。           |
| security guide 要求 probes skip throttle            | 真实 Terminus controller 无 skip metadata                    | health implementation | probe burst 可能 429                     | 在真实 probes skip named throttlers。                |
| docs 引用 `FindDemoParamsDto`                       | 文件/类已删除，controller 用 primitive pipes                 | 文档                  | 用户找不到示例                           | 更新两份指南。                                       |
| `tsconfig.build.json` 排除 specs                    | Nest SWC 仍编译 84 个 spec JS/map                            | 实际 build config     | 镜像膨胀/源码面扩大                      | 修正 SWC input/exclude。                             |
| docs/root 遵循 Prettier 的仓库预期                  | 7 个产品/交付文件在必需 check 中失败                         | 文件与 CI scope       | 持续格式漂移                             | 授权后格式化并加 check。                             |

## 9. 横切风险

### 9.1 架构边界

- **正向证据：** `Inspected`：没有 `common → features` import、没有 sibling feature deep import、没有 controller 直接注入 repository/DataSource、module imports/providers/exports 大体清楚。
- **主要问题：** common/bootstrap 仍携带 Demo WebSocket naming/channel，DB response 暴露 ORM entity，Demo catalog 与 production 没有环境边界。
- **判断：** 两层目录结构成立，但“平台可复用”和“Demo 可整体移除”尚未完全成立。

### 9.2 代表性请求链路与分层违规

| 链路                 | 实际路径                                                                                                               | 正常职责                                 | 违规/缺口                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------ |
| Auth login           | cookie/session parser → CSRF → throttler → LocalAuthGuard/Strategy → DemoAuthService → AuthTokenService/JWT → response | 协议、credential、token signing 分离较好 | production 固定身份；CSRF 文档缺前置；无 credential throttle；response TTL 硬编码。  |
| WebSocket ping       | Socket.IO adapter → handshake JWT → global guards → gateway pipe/filter/interceptor → service → ack/emit               | WS 协议层分工清楚                        | HTTP ThrottlerGuard 在 global guard 阶段崩溃；WS verifier claims 弱；AsyncAPI 偏差。 |
| DB create-with-audit | global middleware/guards/pipes → controller → service → QueryRunner/repository → entity response                       | controller 未直接碰 persistence          | clean production 无 schema；startTransaction fail 不 release；entity 直出 HTTP。     |
| Chunk upload         | CSRF/throttle → Multer limits → file pipe → UploadService state → temp FS                                              | HTTP、workflow、storage 已拆开           | anonymous production、MIME fallback、无 TTL/quota、finalize race/非原子。            |
| Queue enqueue/admin  | HTTP controller → DemoQueueService → CommonQueueService/BullMQ → Redis                                                 | job DTO/processor 边界清楚               | Redis outage 无 deadline；readiness 不反映 Redis；无真实 worker integration。        |

### 9.3 安全

- 最高风险来自“教学功能被当作 production surface”，而不是 crypto primitive；AES-GCM、scrypt、HMAC、timing-safe compare 的实现与测试基础较好。
- Pino 敏感 header 与 `/health` query bypass 形成“凭据泄露 + 审计可规避”的组合风险。
- JWT 三 verifier 和 secret/TTL validation 是配置/语义风险；签名和 expiration 本身仍会校验，因此没有夸大为 auth 全面失效。
- Upload 有 path/UUID/单次大小边界，但缺长期/主体/全局资源边界。
- 供应链 advisory 已按可达性校准，仍不应进入可信 production release。

### 9.4 数据与异步可靠性

- migration 交付是数据主阻断；entity/migration 当前 schema 本身一致。
- DB transaction、cache index、upload finalize 是明确并发/资源缺陷。
- queue/schedule/WS 多实例、retry/idempotency、token revocation仍需产品契约和真实环境。
- SSE/streaming 的基础清理/背压实现未见明显静态 defect，但缺慢客户端/容器测试。

### 9.5 可观测性

- Pino、Sentry、Terminus 均存在且基本装配，但 redaction、env timing、path filter、Redis readiness、shutdown 使其在关键故障时不可信。
- background Sentry isolation 已用于 queue/schedule/events，WS unexpected error 也单独 capture；真实发送/flush/source maps 未验证。
- 无明确 app-level Docker healthcheck，Compose initial dependency health 不等于运行期 application readiness。

### 9.6 部署与运维

- `start:prod -> dist/src/main.js`、YAML asset、entity glob 已核对正确。
- migration、README runtime asset、non-root、dependency ports、spec/maps、真实 dependency smoke 尚不满足生产 artifact contract。
- CI 绿色只说明源码级 lint/unit/build/slice e2e，不说明 clean database/container/Redis/WS production graph。

### 9.7 模板维护成本

- 27 项能力广度较高，但大量机械双语/AI 注释、未闭环 providers、空 OpenAPI、局部文档缺失使新增能力的同步面过大。
- 建议先建立 machine-checkable contract：config keys、generated API docs、artifact contents、route/doc inventory、full-app integration；再清理低价值文本噪声。

## 10. 未验证项、环境阻塞与剩余盲区

下表只描述当前证据边界，不把未运行的路径推定为正常。`最高置信度/分数` 是在补充证据前该路径所能获得的上限，不覆盖第 4 节已因确认 High 降至 2 分的维度总分。

| 未验证项                                                  | 未验证原因                                                                 | 受影响结论                                                                                                  | 当前最高置信度/分数                                                        | 后续所需条件或人工决定                                                                          |
| --------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 完整 production `AppModule` 启动、路由与关停              | 无用户确认的隔离 MySQL/Redis，且禁止启动长期服务                           | 无法证明真实 module graph、bootstrap 顺序、startup failure 和 shutdown 完整可用；`GNL-AUD-003/021` 已有反证 | `Needs verification`；D2/D10/D11/D15 最高 3，确认 High 又将实际分数压到 2  | 隔离、可丢弃 MySQL 8/Redis 7；production-like env；短生命周期进程与端口；启动/停止日志捕获      |
| MySQL migration up/down/up 与 fresh schema                | migration 会修改 schema，本次无可丢弃数据库授权                            | entity 与 migration 静态一致，但不能证明 DDL 可执行、回滚正确或应用查询兼容；`GNL-AUD-004` 的路径缺陷已确认 | 静态链为 `Confirmed`，真实 DDL 为 `Needs verification`；D9 最高 3，实际 2  | disposable MySQL；明确允许 migration；clean volume；最小权限账号；失败后销毁                    |
| Redis cache 与 BullMQ 的真实 outage/reconnect/worker 行为 | 未主动连接工作区配置的 Redis，禁止启动服务                                 | 无法证明 cache consistency、queue retry/stall/flow、shutdown drain；`GNL-AUD-011-013` 仅覆盖可追踪代码缺口  | `Needs verification`；D10/D13 最高 3，实际 2                               | disposable Redis；可控网络故障；至少双 worker；重复投递、断连、恢复和 drain 场景                |
| Dockerfile/Compose 解析、镜像构建与运行                   | `docker` CLI 不可用；提示词也禁止 build/up                                 | 无法证明 YAML schema、最终 UID/权限、资产、端口、healthcheck、fresh volume 和 production start              | `Blocked`；D14/D15 最高 3，实际 2                                          | Docker daemon/CLI；隔离网络与 volume；允许只针对临时镜像做 build/run；不连接外部生产资源        |
| Upload 容量、慢请求、并发 finalize 与多实例               | 本次未启动服务或做负载/故障注入                                            | `GNL-AUD-005/008/009` 已确认设计缺陷；未知实际耗尽速度、竞态概率和多实例一致性                              | 已确认问题为 `Confirmed`；容量数值为 `Needs verification`                  | 隔离磁盘配额；并发 client；故障注入；多实例共享/非共享存储决策；明确可接受容量                  |
| WebSocket 房间 ACL、token 过期/撤销与多实例               | 当前 e2e 是省略 rate-limit 的单实例 slice                                  | 可确认 global guard 冲突，不能证明 room ownership、长期连接身份语义或跨实例广播                             | `Needs verification`；相关 D3/D10 最高 3，实际 2                           | 修复 transport guard 后的完整 AppModule；token clock control；两实例与明确 adapter/ACL 产品契约 |
| Sentry 真实 capture、scrub、flush 与 source maps          | 未使用真实 DSN，禁止外部写；云端构建配置未提供                             | 只能证明 SDK 装配和静态 isolation 调用，不能证明事件送达、PII 策略或栈映射                                  | `Needs verification`；D13 最高 3，实际 2                                   | 隔离 Sentry project/DSN；测试事件；scrub 规则；release/source-map upload 与 shutdown flush      |
| 反向代理与限流 IP 语义                                    | 实际 ingress/topology 未提供，slice e2e 未走 bootstrap                     | `trust proxy=loopback` 是否正确、forwarded header 是否可信无法定论；WS 冲突已独立确认                       | `Needs verification`；D4/D13 最高 3，实际 2                                | 真实代理链说明；隔离 ingress；可信/不可信 hop、IPv4/IPv6、spoofed header cases                  |
| 供应链漏洞的远程可利用性与替换兼容性                      | audit 只证明 advisory 和 production dependency path，未做 exploit PoC/升级 | `GNL-AUD-015` 足以阻断可信发布，但不声称 58 项均可从公网利用                                                | dependency presence 为 `Confirmed`；exploitability 为 `Needs verification` | SBOM/reachability scan；上游修复版本；升级分支的全量回归；必要时隔离 PoC                        |
| 全量 OpenAPI/AsyncAPI browser/client contract             | 本次对代表性真实生成结果做了内存探针，未启动 UI 或生成全部客户端           | `GNL-AUD-024/025` 的系统性样例已确认，但未逐 operation 证明全部偏差                                         | 已确认样例为 `Confirmed`；全量影响为 `Needs verification`                  | 完整 AppModule document snapshot；browser cookie/CSRF Try it out；schema lint/client generation |
| 持续性能、fuzz、DAST、license/SBOM 与外部平台配置         | 不属于现有 CI，且未提供容量目标或平台资产                                  | 不得对吞吐、延迟、抗攻击能力、许可证与云部署作肯定结论                                                      | `Needs verification`；涉及维度最高 3                                       | 明确 SLO/容量、授权测试环境、平台/IaC、数据分级与扫描政策                                       |

剩余治理盲区：仓库没有独立产品需求规格。本次仅以 README、专题文档、公开 API、模块装配、配置、脚本、测试和部署文件重建声明基线；未臆造额外业务功能，也不能判定模板之外的产品需求是否完整。

## 11. 分阶段修复路线图

以下仅为建议，**本次未实施任何修复**。每个阶段都应在独立变更中保留可回滚性，涉及公共 API、认证、schema 或大范围架构时先完成 Human Decisions。

### Phase 0 — 发布阻断、安全与数据风险

| 优先动作                                                                                          | Finding                     | 预期收益                                                               | 主要变更风险                                                | 最低验证门槛                                                                                         |
| ------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| production 默认移除/关闭 `DemosModule`，危险诊断与管理面显式 opt-in                               | `GNL-AUD-001`、`005`        | 立即缩小固定身份、数据库、queue、schedule、upload、Sentry 等公开攻击面 | Demo 教学入口和现有用户路由变化；可能属于公共 API 变更      | production full-app 路由清单；Demo 全部 404；显式开发模式仍可用；匿名危险操作 401/403                |
| 为 Pino 建立 request/response allowlist 或完整 secret redaction，并修正精确 health-path ignore    | `GNL-AUD-002`、`028`        | 阻止 bearer/cookie/CSRF 扩散并恢复审计完整性                           | 可能丢失排障字段或增加日志成本                              | JSON log contract：秘密键/值不存在；method/path/status/request id 保留；query 不绕过                 |
| 将限流 guard 改为 transport-aware，明确 HTTP/WS 各自策略                                          | `GNL-AUD-003`、`027`        | 恢复真实 WebSocket 消息，并使 probes/transport 限流语义可控            | 错误 skip 可能产生未限流面；自定义 tracker 易受代理配置影响 | 完整 AppModule WS connect/ping/join/message；HTTP/WS 各自 429/ack；health burst 不被节流             |
| 修正编译后 migration glob，并提供先迁移后接流量的 production deploy contract                      | `GNL-AUD-004`、`010`        | 让 clean database 可重复创建/回滚，消除运行期首请求失败                | schema/部署顺序、多副本并发和权限属于高风险变更             | build artifact glob；disposable MySQL up/down/up；fresh-volume app smoke；migration 失败阻止 rollout |
| 为 upload 增加认证、owner、TTL、cancel、主体/全局 quota、原子 finalize 和完整清理                 | `GNL-AUD-005`、`008`、`009` | 控制内存/磁盘耗尽、MIME 欺骗和 finalize 竞态                           | 状态模型、存储协议和错误码可能变化；多实例需要持久化决策    | 匿名拒绝；quota/expiry/cancel；双 complete；checksum/assemble fault；orphan cleanup；并发/容量测试   |
| 统一三个 JWT consumer 的 algorithm/issuer/audience/claims 语义，加强生产 secret 与 TTL validation | `GNL-AUD-006`、`007`、`020` | 消除同一 token 在不同入口被不同接受的问题，避免弱配置和客户端过期误判  | auth 行为、token contract 和现有客户端兼容性；需显式确认    | 正确/错误 issuer、audience、algorithm、expired/invalid claims contract；非默认 TTL；HTTP 与 WS 一致  |
| 处理可达 production advisories，优先拆除或隔离 `nestjs-asyncapi` 重型生成链                       | `GNL-AUD-015`               | 降低 2 Critical/28 High 等已知供应链风险                               | major 升级/替换可能改变 AsyncAPI、Nest/Express/TypeORM 行为 | `pnpm audit --prod` policy；SBOM/reachability；lint/tsc/unit/build/e2e/document generation 全回归    |

### Phase 1 — Medium、关键集成测试与契约闭环

| 优先动作                                                                            | Finding                  | 预期收益                                                              | 主要变更风险                                  | 最低验证门槛                                                                                              |
| ----------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 补齐 DB/cache/queue 的 failure、timeout、atomicity 与 readiness 语义                | `GNL-AUD-010-014`        | 避免连接泄漏、索引竞态、挂起请求和错误绿色 readiness                  | Redis/MySQL 故障策略会影响可用性与一致性      | disposable services；start/commit/rollback/release matrix；并发 cache；Redis outage/recover；worker drain |
| 明确 bootstrap 启动/失败/优雅关停协议                                               | `GNL-AUD-014`、`016`     | 让启动失败和 Sentry/连接关闭可诊断、可预测                            | 退出码和 shutdown hooks 可能改变部署平台行为  | startup failure exit；SIGTERM；connection/worker/timer/flush completion；不泄密日志                       |
| 统一 env 来源、优先级、production baseline 和 tracked template 策略                 | `GNL-AUD-016`、`017`     | clean clone 与 production 配置可复现，避免 secret 误提交和静默失效    | env precedence 变化可能影响现有部署           | config key contract；tracked 文件只含占位；`.local`/process env precedence；Sentry pre-bootstrap test     |
| 加固 Docker/Compose artifact：non-root、最小端口、README/static assets、healthcheck | `GNL-AUD-018`、`019`     | 减少容器权限/网络面并保证示例路由存在                                 | UID/FS 权限、运维端口和 writable tmp 兼容性   | image inspect；read-only root + writable tmp；non-root smoke；dependency ports policy；streaming route    |
| 新增至少一套真实 bootstrap/full-App e2e，并保留切片单测速度                         | `GNL-AUD-021`、`027`     | 捕获 WS/rate-limit、versioning、middleware、config 与外部集成组合缺陷 | CI 时长与临时服务复杂度增加                   | `/v1`/neutral 路由、CSRF/auth/rate/WS、500/error filter、MySQL/Redis outage；资源销毁                     |
| 让 TypeScript、Nest SWC、ESLint 与 CI 的 strict 声明一致                            | `GNL-AUD-022`            | 把文档承诺转成机器门禁                                                | 一次开启全部 strict 可能产生大面积重构        | 分项 baseline；独立 tsc；SWC type-check；lint 全通过；禁止用 `any`/disable 规避                           |
| 修正文档可执行链、OpenAPI/AsyncAPI metadata 和五个 Demo 使用指南                    | `GNL-AUD-020`、`023-026` | 使用户能从文档正确启动、认证、发送请求并生成客户端                    | API schema/示例一旦成为契约可能暴露现有不一致 | generated document snapshots；本地 link/path check；cookie-jar/CSRF examples；每项 Demo smoke             |

### Phase 2 — Low、清晰度、文档与 DX

| 优先动作                                                                 | Finding                     | 预期收益                                                | 主要变更风险                                    | 最低验证门槛                                                                          |
| ------------------------------------------------------------------------ | --------------------------- | ------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| 清理 common 中 Demo WS 契约、ORM entity 直出和未接入的 cache interceptor | `GNL-AUD-029-031`           | 强化平台/feature/transport/persistence 边界             | DTO/事件结构可能形成公共 API 变化               | import-boundary check；serialization contract；cache hit/miss/invalidation e2e        |
| 为 upstream HTTP response、schedule timer 与 login throttle/长度补边界   | `GNL-AUD-032-034`           | 降低外部 schema 漂移、timer 状态误导和 credential abuse | validation/retry/throttle 策略可能影响现有 Demo | malformed upstream；timer overview/lifecycle；credential-specific 429 与输入上限      |
| 将 coverage/format/artifact hygiene 纳入 CI                              | `GNL-AUD-035`、`036`、`038` | 防止关键分支、spec/map、文档/root 配置继续漂移          | 阈值过急会阻塞迭代；source map 可能用于 Sentry  | 渐进 threshold；artifact allowlist；`format:check`；明确 production source-map policy |
| 修正文档旧符号并去除机械注释/违规命名                                    | `GNL-AUD-037`、`039`        | 提升查找和 code review 信息密度                         | 大批机械重写会制造噪声                          | path/symbol lint；小批变更；lint/tsc/test；人工 review “why” 注释                     |
| 增加 package `engines` 并校准模板 metadata                               | `GNL-AUD-040`               | 在安装前暴露 Node 版本要求                              | 过严范围可能阻止实际可用版本                    | clean install on declared minimum/current Node；CI matrix 或明确单版本政策            |

### Human Decisions

以下问题不能由技术审计代替产品/平台决策：

1. **公共路由与版本：** 根 controller 应为 `/v1` 还是 `VERSION_NEUTRAL`；Demo/health 的 neutral 边界是否长期承诺（`GNL-AUD-021`）。
2. **Demo 产品边界：** production 是否完全移除 Demo，还是保留受认证的管理/诊断子集；这决定 `GNL-AUD-001/005` 的最终架构。
3. **认证契约：** Passport、手写 HTTP guard、WS handshake 是否共享一个 verifier；允许的 algorithms/issuer/audience/claims、token TTL 响应字段和撤销策略（`GNL-AUD-006/007/020`）。
4. **数据库与部署：** migration 是否由独立 job、init step 或平台 release phase 执行；schema/public API 变化和多副本锁策略均需确认（`GNL-AUD-004`）。
5. **Session 与 secret 来源：** production session store 选型；哪些 `.env.*` 可跟踪；平台 secret 注入与 precedence（`GNL-AUD-017`）。
6. **WebSocket/异步多实例：** room ACL、token expiry/revocation、Socket.IO adapter、queue idempotency、schedule leader/lock 的业务保证。
7. **容器/供应链政策：** non-root/read-only FS、dependency ports、source maps、SBOM/license/audit severity gate 和例外审批。
8. **大范围清理：** strict TypeScript、机械注释和命名整改应分批推进，避免演变为未经授权的大型跨模块重构。

## 12. 附录

### 12.1 文件、模块、测试与文档计数

| 类别                                  |          数量 | 口径                                                                   |
| ------------------------------------- | ------------: | ---------------------------------------------------------------------- |
| `src/common/**/*.ts`                  |            77 | 第一方 TypeScript 文件                                                 |
| `src/features/**/*.ts`                |           222 | 第一方 TypeScript 文件                                                 |
| `src/bootstrap/**/*.ts`               |             2 | 共享 bootstrap 文件                                                    |
| `src/migrations/**/*.ts`              |             1 | migration                                                              |
| `config/**/*`                         |            12 | 配置源码、类型、测试与 YAML                                            |
| `test/**/*`                           |             5 | 4 个 e2e TS + 1 个 Jest 配置                                           |
| `docs/**/*`                           |            20 | 含产品专题、既有 audits/superpowers；产品口径为 README + 16 个顶层专题 |
| root/CI/build/runtime/config          |            20 | 根级关键文件 + `.github/workflows/ci.yml`                              |
| modules / controllers / services      |  36 / 23 / 33 | `*.module.ts` / `*.controller.ts` / `*.service.ts`                     |
| guards / strategies / filters / pipes | 7 / 2 / 1 / 2 | 按文件职责计数                                                         |
| interceptors / decorators / adapters  |     2 / 6 / 1 | 按文件职责计数                                                         |
| gateways / processors / listeners     |     1 / 1 / 1 | 按文件职责计数                                                         |
| DTO / entity / migration              |    83 / 1 / 1 | 第一方声明文件                                                         |
| unit specs                            |            84 | 实际 Jest suite 输出与文件盘点一致                                     |
| e2e specs                             |             4 | 10 tests，均为 slice                                                   |

### 12.2 六分区实际覆盖

| 分区                       | Scope reviewed                                                                                     | 关键输出                                              | 未验证/覆盖边界                               | Mutation confirmation |
| -------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------- | --------------------- |
| A 完成度/架构/清晰度       | App/Demos/全部 module，common/features 依赖，代表性 controller→service→integration，类型/命名/注释 | 能力闭环、边界、DTO/entity、strict 与维护性候选       | 真实 runtime module graph 受外部依赖限制      | 未改文件              |
| B 正确性/可靠性/性能       | DB/cache/queue/schedule/events/HTTP/upload/SSE/streaming/WS/启动关停                               | 并发、生命周期、超时、失败路径与动态只读 probes       | 真实 MySQL/Redis、慢客户端、多实例、负载      | 未改文件              |
| C 安全/供应链              | auth/authz/JWT/CSRF/CORS/session/Helmet/validation/logger/Sentry/upload/Docker/dependencies        | 生产可达性、secret redaction、资源耗尽、advisory path | 漏洞 exploit PoC、真实 proxy/Sentry/container | 未改文件              |
| D 测试/验证质量            | 84 unit specs、4 e2e、Jest/SWC/CI、coverage 产物                                                   | 装配深度、assertion/mock/flaky、关键低覆盖            | 无 full-app/真实依赖 integration              | 未改文件              |
| E 文档/契约                | README、16 个专题、project notes、controller/DTO、生成 OpenAPI/AsyncAPI、链接/路径                 | 启动/CSRF/env/API/WS 文档偏差与缺失                   | 未启动 browser UI/全量 client generation      | 未改文件              |
| F 配置/数据/可观测/交付/DX | YAML/env/types/usage、TypeORM、health/Pino/Sentry、Docker/Compose/CI/package/build artifact        | migration、readiness、logger、container、artifact、DX | Docker/MySQL/Redis 与外部平台                 | 未改文件              |

### 12.3 重点搜索、命令与产物核对摘要

- **Executed：** 第 3 节全部预定命令均有 `Pass/Fail/Blocked/Skipped`；没有在失败后停止。
- **Inspected：** 使用全量文件清单、`rg` 符号/import/config key/route/test pairing 搜索，逐个读取非平凡 module/controller/service/guard/strategy/filter/pipe/interceptor/adapter/gateway/processor/listener。
- **Executed/Inspected：** 生成并检查 coverage JSON、Compodoc、SWC build；核对 `start:prod`、YAML、entity/migration glob、spec/map 和 Docker copy contract。
- **Executed：** 定向内存 probes 覆盖 stock WS throttler、JWT 三路径/TTL、MIME fallback、生成 OpenAPI/AsyncAPI、versioning、Pino serializer/path filter。
- **Executed：** `pnpm why` 和 `pnpm audit --prod` 复核直接/间接 production dependency path；未做漏洞利用。
- **Inspected：** 全量本地 Markdown link/path 搜索、config env/YAML 键闭环、tracked env 只读键/性质审查；报告与聊天均未回显 secret 值。
- **Inspected：** 第 6.6 节记录已明确检查而未认定缺陷的高风险点，避免把“未发现”误写为“没有风险”。

### 12.4 能力矩阵 Not Applicable 说明

能力矩阵 `Not Applicable = 0`。27 项均由当前仓库明确声明并存在实现/consumer，因此全部适用；其中 6 项达到本次职责闭环，21 项因确认缺陷、生产集成、测试或文档缺口标为 `Partial`。某项没有独立 e2e 时在对应单元格说明，不以 N/A 掩盖缺口。

### 12.5 十九项热点核查

|   # | 结论                   | 证据与说明                                                                                                                                                    |
| --: | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | **已确认问题**         | Passport strategy 校验 issuer/audience，手写 HTTP/WS verifier 只做默认 signature/exp；探针确认错误 issuer/audience/HS512 在直接路径被接受，见 `GNL-AUD-006`。 |
|   2 | **已确认问题**         | Cache/queue 均依赖 Redis，而 readiness 仅检查 MySQL，见 `GNL-AUD-013`。                                                                                       |
|   3 | **已确认问题（局部）** | Demo/health 的 `VERSION_NEUTRAL` 与文档大体一致；根 controller 在真实 bootstrap 仅 `/v1`，app e2e 却断言 `/`，见 `GNL-AUD-021`。                              |
|   4 | **已确认问题**         | 4 个 e2e 均为 feature slice，只有 CSRF slice 调共享 bootstrap，0 个导入完整 `AppModule`，见 `GNL-AUD-021`。                                                   |
|   5 | **设计合理但有缺口**   | 非平凡 providers 大多有直接/等价测试；upload/DB/cache/queue/bootstrap 等 failure/integration 路径仍缺，见第 7.3 节。                                          |
|   6 | **设计合理但仍需验证** | queue/schedule enabled 开关的注册/业务分支与单测可追踪，test 隔离合理；真实 Redis worker、多实例 scheduler 与文档边界尚未验证。                               |
|   7 | **设计合理**           | production + MemoryStore 被明确 fail-closed；默认配置不会静默把 MemoryStore 当 production store。生产配置说明不完整归 `GNL-AUD-017`。                         |
|   8 | **设计合理但仍需验证** | queue/schedule/events 使用 Sentry isolation，WS unexpected errors 有 capture；真实送达、scrub、flush/source map 未验证。                                      |
|   9 | **已确认问题**         | `DB_SYNCHRONIZE=false` 时没有可用 production migration glob/job，见 `GNL-AUD-004`。                                                                           |
|  10 | **已确认问题**         | README Quick Start 对 Compose 作一步运行承诺，但 fresh DB migration 和 production env/secret baseline 不闭环，见 `GNL-AUD-004/017`。                          |
|  11 | **已确认问题**         | 文档/规则称 strict，`tsconfig`/ESLint 实际不构成 strict 门禁，见 `GNL-AUD-022`。                                                                              |
|  12 | **已确认问题（边界）** | Docker/测试/文档凭据多数明确是示例，不因硬编码单独定性泄密；但固定 Demo 身份进入 production 真实签发链，见 `GNL-AUD-001`。                                    |
|  13 | **已确认问题**         | 配置 helper 的机械注释及部分仅字段处理的 `parse/normalize` 命名违反仓库规则，见 `GNL-AUD-039`。                                                               |
|  14 | **已确认问题**         | test 分支排除 queue/真实依赖本身合理，但切片装配掩盖 WS/global guard 和 root versioning，见 `GNL-AUD-003/021`。                                               |
|  15 | **已确认问题（局部）** | CSRF/Helmet/validation 等顺序已有共享 bootstrap 测试；logger/rate-limit/WS 与 health filter 存在 `GNL-AUD-002/003/027/028`。                                  |
|  16 | **已确认问题**         | 独立 tsc 与 SWC 当前通过，但严格选项/ESLint severity 不匹配声明，且 CI 无独立 strict contract，见 `GNL-AUD-022`。                                             |
|  17 | **已确认问题（局部）** | `dist/src/main.js`、`dist/config/config.yaml` 和 entity glob 正确；migration glob 0 命中，见 `GNL-AUD-004`。                                                  |
|  18 | **已确认问题**         | 当前 e2e 是切片；未真实验证 root versioning、完整 `AppModule` 和 production bootstrap，见 `GNL-AUD-021`。                                                     |
|  19 | **已确认问题（治理）** | tracked env 仅按键/占位性质审查，报告未泄密；文档建议与 loader/ignore precedence 不一致，见 `GNL-AUD-017`。                                                   |

### 12.6 已检查/未检查第一方文件与生成物

- **已检查：** 第 1 节声明的 `src/common`、`src/features`、`src/bootstrap`、`src/migrations`、`config`、`test`、产品 `docs`、README、根级构建/运行/容器/质量配置与 CI；所有非平凡实现已内容审查。
- **未检查：** 声明范围内无未说明遗漏。既有 `docs/audits/**`、`docs/superpowers/**` 只盘点不作为产品证据；IDE metadata、`.git` 和未提供的外部平台/IaC 不在范围。
- **本次验证生成的 ignored artifacts：** `dist/`（约 3.5 MiB）、`coverage/`（约 11 MiB）、`documentation/`（约 13 MiB）。它们是允许的 build/coverage/Compodoc 输出，未纳入正式 finding 文件计数。
- **本次唯一主动项目写入：** `docs/audits/2026-07-28-gnester-lite-full-audit.md`。

### 12.7 Mutation Guard

最终 mutation guard：**Pass（Executed，15:33–15:34 CST）**。

- `git diff --name-only` 与 `git diff --cached --name-only` 均为空：没有 tracked 源码、配置、测试、lockfile 或现有文档被修改。
- 结束时仍为 `master...origin/master`；起始时已有的 `.cursor/`、`docs/audits/`、`docs/superpowers/`、`prompts/` untracked 范围仍在。展开检查后，本次新增且非 ignored 的文件只有本报告。
- 以审计开始时间为边界检查 `docs/audits/`，只有 `docs/audits/2026-07-28-gnester-lite-full-audit.md` 是本次新文件；既有 2026-07-23/27 文件未改。
- `git check-ignore -v` 确认 `dist/`、`coverage/`、`documentation/` 分别由 `.gitignore` 规则忽略，且只作为 build/coverage/Compodoc 验证产物。
- 未执行 commit、push、reset、checkout、migration、数据库写入、Docker build/up 或任何自动修复命令。
