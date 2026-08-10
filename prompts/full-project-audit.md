# gnester-lite 一次性完整只读审计 Prompt

> **直接调用**
>
> ```text
> 读取并严格执行 prompts/full-project-audit.md，对当前 gnester-lite 工作区进行一次性完整只读审计。
> ```

---

## 0. 角色、目标与最终交付

你是本仓库的**首席项目质量审计 Agent**，同时承担 NestJS/TypeScript 架构师、测试负责人、安全审计员、SRE 和技术文档审阅者职责。你的任务不是修代码，而是通过静态检查、命令执行、运行时验证和文档对照，对当前工作区最终状态进行一次**从零开始、全量、只读、证据驱动**的审计。

你必须同时交付：

1. 聊天中的简体中文执行摘要。
2. 仓库内完整报告：
   `docs/audits/YYYY-MM-DD-gnester-lite-full-audit.md`

`YYYY-MM-DD` 使用执行当天日期。若同名文件已存在，追加 `-HHmmss`，禁止覆盖已有报告。

审计目标：

- 判断模板能力是否完整、可运行、可理解、可测试、可部署。
- 发现已确认 bug、潜在缺陷、安全风险、测试缺口、文档偏差、结构问题和清晰度问题。
- 区分确认缺陷、合理风险、环境阻塞、设计权衡和一般改进建议。
- 给出有优先级的修复路线图，但**不实施任何修复**。

最终必须明确回答：

1. 仓库声称提供哪些能力，各自是完整、部分完成、仅 Demo、缺失还是无法验证。
2. 是否存在功能 bug、边界/异常缺陷、并发与异步缺陷、安全风险、数据风险或生产发布阻断。
3. 测试是否验证了真实行为，文档、OpenAPI、AsyncAPI、配置、构建产物和运行行为是否一致。
4. 当前状态是否可学习、可维护、可本地验证、可构建交付和可生产部署。
5. 若未达到目标，阻塞发布的最小问题集合、修复顺序和每项验收方法是什么。

### 0.1 默认执行参数

<!-- AI modified: explicit defaults prevent a full audit from silently expanding into destructive integration work. -->

调用者没有覆盖时使用以下默认值；工具可用不代表已获得额外授权：

| 参数                    | 默认值               | 含义                                                             |
| ----------------------- | -------------------- | ---------------------------------------------------------------- |
| 审计模式                | `AUDIT_ONLY`         | 只审计，不修复源码、测试、配置或现有文档                         |
| 安装既有依赖            | `CONDITIONAL`        | 仅依赖缺失或确需验证锁文件时允许 frozen install                  |
| 只读网络检查            | `ALLOW_IF_AVAILABLE` | 可执行依赖漏洞/版本元数据查询；失败记为 Network Blocked          |
| Docker image build/run  | `DENY`               | 需调用者明确授权，且不得启动长期服务                             |
| 可丢弃 MySQL/Redis 集成 | `DENY`               | 需调用者明确确认目标是隔离、loopback、可丢弃环境并通过项目安全门 |
| 写入范围                | `REPORT_ONLY`        | 仅写唯一审计报告及工具生成的 ignored artifacts                   |
| 输出                    | `zh-CN / FULL`       | 简体中文完整报告，聊天仅给摘要                                   |

若调用者覆盖参数，必须在报告元数据中记录覆盖项。未获授权的深度验证必须标记 `Blocked` 或 `Skipped`，不得假装通过，也不得因此跳过静态审计。

---

## 1. 不可违反的执行边界

### 1.1 只审计当前工作区

- 以当前文件内容为唯一代码基线。
- 不比较当前工作区与 `HEAD`，不分析未提交改动的来源、作者或提交策略。
- `git status` 仅可用于记录审计开始/结束的文件状态，防止本次审计误改文件；不得把既有未提交状态写成质量缺陷。
- `prompts/self-audit-loop.md` 和 `.cursor/self-audit-state.md` 只可作为历史上下文，**不得把其中的分数、“已完成”或停止状态当作本次审计证据**。

### 1.2 禁止修复和破坏性操作

除最终审计报告及工具产生的被忽略目录外，不得修改、创建或删除项目文件。

默认参数下禁止：

- 修改源码、配置、测试、现有文档或现有提示词。
- 运行 `pnpm run lint`、`pnpm run format` 等会写入文件的命令。
- 使用 `--fix`、`--write`、`--updateSnapshot` 或跳过校验的参数。
- 新增、删除或升级依赖。
- 启动 MySQL、Redis、应用服务、Docker Compose 服务或其他长期进程；显式授权的短生命周期隔离验证仅按第 6.3 节执行。
- 执行数据库迁移、schema 同步、生产数据操作；即使是测试 migration，也必须先满足第 6.3 节的双重安全门。
- commit、push、rebase、reset、checkout 覆盖文件或其他破坏性 Git 操作。
- 输出 `.env`、密钥、token、Cookie、密码或连接串的真实值。

允许：

- 读取全部非敏感仓库文件。
- 执行非修复型 lint、测试、构建、覆盖率、文档和配置校验。
- 仅在依赖缺失或需要验证锁文件时运行 `pnpm install --frozen-lockfile`；不得改变锁文件。
- 生成被 `.gitignore` 忽略的 `dist/`、`coverage/`、`documentation/`、`src/metadata.ts` 等验证产物；不得擅自删除审计前已存在的产物。
- 创建 `docs/audits/` 和本次审计报告。

### 1.3 失败不应终止审计

- 任一命令失败后，先判断是代码失败、环境阻塞、工具调用错误还是网络问题。
- 记录证据后继续其余动态验证和静态审计。
- 如果命令参数误用，允许纠正一次并记录最终有效命令；不得把调用错误算作项目缺陷。
- 不允许因为 lint/test/build/e2e 中任何一项失败而跳过剩余维度。

### 1.4 证据纪律

所有结论必须标注：

- `Executed`：来自实际命令或运行时输出。
- `Inspected`：来自代码、配置、测试或文档检查。
- `Assumed`：仅说明限制或待验证假设，不能单独支撑确认缺陷。

禁止：

- 没有路径、行号、符号或命令证据的正式 finding。
- 把“没看到”写成“不存在”，除非已完成可复核的全量搜索。
- 把外部服务不可用写成代码失败。
- 把测试通过等同于没有 bug。
- 仅根据文件名或注释判断行为。
- 把“审计覆盖率”当成“项目完成度”；二者必须分别报告。
- 用文件数量、测试数量或主观权重虚构项目完成度百分比。
- 没有触发条件、适用环境、预期行为、实际行为和可达调用链就判定高严重度缺陷。

---

## 2. 项目事实与误报防护

以下是审计起始事实，执行时仍需用当前代码核对；若代码已变化，以当前代码为准并在报告中说明。

<!-- AI modified: make the completeness baseline and layer-responsibility checks explicit. -->

### 2.0 完成度判定基线

- 先从 `README.md`、专题文档、公开 API、模块装配、配置、脚本、测试和部署文件重建“项目声称提供什么”的需求基线。
- 分开评估：
  1. **声明完成度**：仓库已经承诺的能力是否形成实现、装配、配置、测试、文档和运行闭环。
  2. **生产完成度**：作为生产模板所必需的安全、可靠性、可观测性、迁移、交付和运维条件是否具备。
  3. **示例完成度**：Demo 是否足以教学、可验证、可移除，且不会被误解为生产实现。
- 仓库没有产品需求规格时，不得臆造业务功能并判为“缺失”；应把“缺少权威需求基线”列为限制或治理建议。
- “文件存在”“模块能编译”“测试通过”都不能单独证明能力完成；必须沿真实入口核对可达性和行为闭环。

### 2.1 技术与运行环境

- NestJS 11 + TypeScript，Node.js 24。
- pnpm 11.1.2；本项目使用 pnpm/Nest CLI，不使用 Vite+ 工作流。
- Nest CLI + SWC 构建，Jest + `@swc/jest` 测试。
- MySQL 8 和 Redis 7 是运行时依赖。
- TypeORM、BullMQ、Keyv Redis、Passport/JWT、Sentry、Pino、Socket.IO、OpenAPI、AsyncAPI 均属于重点审计面。

### 2.2 架构事实

- `src/bootstrap/`：应用生命周期与协议接入层，负责启动、关停和有顺序要求的 HTTP pipeline 装配；`src/bootstrap/http/` 归属 CORS、Helmet、OpenAPI、ValidationPipe 和 Socket.IO adapter 等接入代码。
- `src/platform/`：业务中立的平台能力，按 infrastructure、observability、operations、runtime、security 等职责分类；能力模块必须由真实消费者显式导入。
- `src/features/`：正式生产业务目录；Feature 自己拥有 controller、service、DTO、实体、迁移和测试。
- `src/examples/`：可整体移除的教学与集成 Demo；Example 自己拥有 controller、service、DTO、测试和仅服务该示例的契约。
- `src/contracts/`：无 NestJS/Express/TypeORM/BullMQ 等框架依赖的稳定共享 TypeScript 契约；只允许依赖同层契约或 `node:` 内置模块。
- 预期依赖方向是 `AppModule → bootstrap + platform + features + examples + contracts`、`bootstrap/features/examples → platform + contracts`、`platform → contracts`；禁止 `platform → bootstrap/features/examples`，禁止 `features/bootstrap → examples`，禁止 `contracts → bootstrap/platform/features/examples`。
- `src/common/` 是已退役目录；任何残留 TypeScript 实现都应由 `verify:architecture` 判为违规，不能继续作为共享杂物层。
- Demo 通过 `DemosModule` 聚合，`AppModule` 不需要逐个导入全部 Demo。
- 当前 production 模块图应排除整个 `DemosModule`；development/test/provision 的模块图不同，必须分别验证，不能由某一环境外推其他环境。
- Demo 数据库迁移归属 `src/examples/demo-database/migrations/`：development/test/provision 数据源应发现它，production 数据源不得发现它，因此全新生产库不创建 Demo 表。该发现边界不会自动删除旧生产库已有的 Demo 表或迁移记录，迁移类名必须保持稳定以延续 TypeORM history。
- 当前 test 模块图应排除 `DemoQueueModule`，而 `provision` 用于可丢弃基础设施上的完整应用验证；这些是待当前代码复核的刻意边界，不是自动缺陷。
- auth、authorization、crypto、cache、queue、schedule、http-client 等 platform 能力可由 feature 或 example 按需显式导入；没有出现在 `AppModule` 不自动等于漏接入。
- 自定义 platform 模块不得用 `@Global()` 隐藏依赖；同时必须区分 Nest 第三方动态根模块自身的 global 语义，并检查是否造成重复注册或生产泄漏。
- cors、openapi、security、validation、websocket adapter 等能力可以通过 bootstrap 配置函数接入，不强求每项都有 `*.module.ts`。
- AsyncAPI 当前由 `demo-websocket` example 提供 HTTP 文档端点，不得因旧 common/asyncapi 实现已退役而机械判为能力缺失。

### 2.3 启动与路由事实

权威启动链路是：

1. `src/instrument.ts`
2. `src/main.ts`
3. `src/app.module.ts`
4. `src/bootstrap/configure-application.ts`

审计实际中间件顺序，不沿用历史提示词中的顺序描述。

全局 URI versioning 与 controller 的 `VERSION_NEUTRAL` 可以并存：

- 路由是否带 `/v1`，必须联合检查 `enableVersioning()`、`@Controller()`、`@Version()` 和 `VERSION_NEUTRAL`。
- Demo 与 health 使用无版本路由可能是刻意设计，不能机械判错。
- 只有代码、测试、OpenAPI 和文档互相矛盾时，才形成正式 finding。
- OpenAPI 只在 development 装配，AsyncAPI 随 Demo catalog 从 production 排除；必须分别核对“生成文档覆盖的编译 controller”“各环境真实 module graph”和文档可达性。

### 2.4 配置与测试事实

- 配置采用 YAML 默认值与环境变量双层校验。
- 环境枚举包含 development、test、provision、production；必须核对 dotenv、Sentry、模块装配、队列/调度和生产校验在四种环境中的职责。
- test 环境可能排除 `DemoQueueModule`、启用 BullMQ `lazyConnect/manualRegistration`、跳过 Sentry 初始化、禁用计划任务；provision 则用于真实 MySQL/Redis 集成且仍不得泄漏为可部署环境。
- 先核对这些分支的目的、隔离范围和生产泄漏风险，再判断是否为缺陷。
- 示例账号、示例密钥和 Docker 占位值不能仅因“硬编码”自动判为漏洞；必须判断是否明确标为示例、是否可能进入生产、是否被文档正确警示。

### 2.5 外部环境事实

- MySQL/Redis、Docker daemon、外网或包审计服务不可用时，记录为 `Environment Blocker`。
- 若应用设计声称某能力可在无外部服务时工作，而实际启动失败，则可另立代码/文档 finding。
- 当前 CI 声称通过 service containers 验证 migration round-trip、完整 `AppModule` 和 production entry；本地被阻塞不等于 CI 没覆盖，必须分别审计 workflow 声明和本次实际执行证据。
- 不得自动启动服务来消除环境阻塞。

---

## 3. 总体执行流程

必须严格按以下阶段执行，不得直接跳到报告：

1. **Preflight**：读取规则、确认环境、记录开始状态。
2. **Inventory**：全量盘点目录、模块、能力、测试和文档。
3. **Dynamic Verification**：运行所有适用的非修复验证。
4. **Six-Lane Audit**：六个审计分区并行或顺序完成。
5. **Cross-Validation**：主控复核、去重、补漏和校准严重度。
6. **Coverage Gate**：检查全量能力矩阵、命令矩阵和目录覆盖。
7. **Report**：写完整报告和聊天摘要。
8. **Mutation Guard**：确认本次未改动既有项目文件。

---

## 4. Phase 1 — Preflight

### 4.1 读取约束

至少读取：

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `tsconfig.json`
- `tsconfig.build.json`
- `tsconfig.test.json`
- `tsconfig.compodoc.json`
- `nest-cli.json`
- `.swcrc`
- `.swcrc.build`
- `eslint.config.mjs`
- Prettier 配置（若存在）
- `.github/workflows/ci.yml`
- `Dockerfile`
- `docker-compose.yml`
- `.gitignore`
- `.dockerignore`
- `.env.example`
- `scripts/**/*.mjs`
- `prompts/**/*.md`

对仓库已跟踪的 `.env.*`：

- 允许核对键名、覆盖优先级、占位值性质和生产误用风险。
- 禁止在命令输出、子任务消息、报告或聊天中回显任何真实值。
- 需要证明弱默认值时，只描述风险类别、文件与变量名；不要复制值。

如果规则冲突：

1. 用户本次要求优先。
2. 更具体的项目规则优先于通用工作区规则。
3. 记录冲突及采用的解释，不擅自改文件。

### 4.2 记录环境

记录但不要泄露秘密：

- 执行日期与时区。
- OS、Node.js、pnpm 版本。
- 当前分支名，仅作元数据。
- 相关 CLI 是否可用。
- `node_modules` 是否存在，锁文件与声明的 package manager 是否匹配。
- MySQL、Redis、Docker、网络等验证能力是否可用；不要主动连接生产地址。
- 默认审计参数及调用者显式覆盖项。

### 4.3 开始状态保护

- 记录开始时的文件状态。
- 不阅读或输出敏感 `.env` 内容。
- 不分析相对 `HEAD` 的代码差异。
- 记录本次允许写入的目标报告路径。

---

## 5. Phase 2 — Inventory 与能力矩阵

### 5.1 必须盘点的范围

逐项列出并计数：

- `src/bootstrap/**/*.ts`
- `src/platform/**/*.ts`
- `src/features/**/*.ts`
- `src/examples/**/*.ts`
- `src/contracts/**/*.ts`
- `src/common/**/*.ts`（预期为空；若存在则按退役层残留审计）
- `src/migrations/**/*.ts`（production 可发现的应用迁移）
- `src/features/**/migrations/**/*.ts`（正式 Feature 自有迁移）
- `src/examples/**/migrations/**/*.ts`（即使已包含于 examples glob，仍须单独重建环境发现规则）
- `config/**/*`
- `test/**/*`
- `docs/**/*`
- `scripts/**/*`
- `prompts/**/*`
- `.github/**/*`
- 根级构建、运行、容器、CI、lint、format、TypeScript、SWC、Jest 配置
- 所有 `*.module.ts`、`*.controller.ts`、`*.service.ts`、guard、strategy、filter、pipe、interceptor、decorator、adapter、gateway、processor、listener、DTO、entity、migration
- 所有 `*.spec.ts` 与 `*.e2e-spec.ts`

不得只抽样文件名。对非平凡实现必须读取内容。

Inventory 必须保留“已检查第一方文件”和“未检查第一方文件”清单。只要仍有未说明原因的第一方文件未检查，就不得声称完成了全量审计。

对生成物、第三方代码、历史审计报告和工具状态文件单独分类，不得把它们冒充当前实现证据；历史报告只能用于形成待重新验证的线索。全量搜索还应核查 TODO/FIXME/HACK、占位实现、跳过/聚焦测试、类型或 lint 抑制、死路由、死导出和可疑硬编码，但字符串命中本身不是 finding。

### 5.2 能力矩阵

至少为以下能力建立矩阵；当前仓库出现的新能力也必须追加：

- auth
- authorization
- cache
- configuration
- cookies
- cors
- crypto
- csrf
- database
- events
- health
- http-client
- logger
- openapi
- asyncapi
- queue
- rate-limit
- schedule
- security/helmet
- sentry
- serialization
- session
- sse
- streaming-files
- upload
- validation
- websocket

每一行必须包含：

| 字段               | 要求                                                                |
| ------------------ | ------------------------------------------------------------------- |
| 能力               | 名称与职责                                                          |
| platform/bootstrap | 平台实现或接入点                                                    |
| demo/consumer      | 使用方；没有时说明原因                                              |
| module wiring      | AppModule、DemosModule 或 feature import                            |
| config             | YAML/env/type/default/生产约束                                      |
| unit tests         | 文件及核心覆盖                                                      |
| e2e                | 场景与装配深度                                                      |
| docs               | README/专题/OpenAPI/AsyncAPI                                        |
| runtime dependency | MySQL/Redis/网络/文件系统等                                         |
| 状态               | Complete / Partial / Demo Only / Missing / Blocked / Not Applicable |
| 证据               | 路径、符号、测试或命令                                              |

不要强求所有能力具有完全相同的文件形态。矩阵衡量的是“实现、使用、配置、测试和说明是否与该能力真实职责相匹配”。`Demo Only` 表示能力被明确限制为教学实现且文档没有冒充 production；它既不等于 `Complete`，也不自动构成缺陷。

### 5.3 源码—测试配对清单

生成并核查：

- 非平凡 service/controller/guard/strategy/filter/pipe/interceptor/adapter/gateway/processor/listener 是否有直接或等价测试。
- 无同名 spec 不自动等于无覆盖；必须搜索其行为是否被其他测试覆盖。
- 有 spec 不自动等于覆盖有效；必须检查断言和失败路径。

---

## 6. Phase 3 — Dynamic Verification

### 6.1 运行原则

- 先读取 `package.json` 实际 scripts，再决定命令是否适用。
- 顺序执行，记录开始/结束、退出码、耗时和关键摘要。
- 保留完整原始输出位置或足以复核的摘要，不把整段噪声复制进主报告。
- 一条命令失败后继续下一条。
- 不使用自动修复选项。

### 6.2 当前仓库 CI 对齐命令矩阵

<!-- AI modified: audit the same production and test boundaries that the repository's current CI enforces. -->

先从当前 `package.json` 和 `.github/workflows/ci.yml` 重建实际门禁顺序，并报告二者与 README/AGENTS 的任何差异。以下是当前基线；文件若已变化，以仓库当前声明为准，新增/删除命令也必须进入矩阵。

环境与依赖：

```bash
node --version
pnpm --version
pnpm install --frozen-lockfile # 仅在依赖缺失或确需验证锁文件时
```

默认可执行的非修复门禁，尽量保持 CI 顺序：

```bash
pnpm run verify:container-references
pnpm run peers:check
pnpm run format:check
pnpm run lint:check
pnpm run typecheck
pnpm run test:cov
pnpm run test:integration-policy
pnpm run build
pnpm run verify:architecture
pnpm run verify:artifact
pnpm run verify:openapi
pnpm run compodoc
docker compose config --quiet
pnpm run test:e2e
pnpm run audit:prod
```

要求：

- `pnpm run typecheck` 必须同时覆盖 production 与 test TypeScript 边界，不能只用 production `tsc` 替代。
- `pnpm run format:check` 是权威非写入格式门禁，不用更窄的手写 glob 冒充全量检查。
- `pnpm run test:cov` 已覆盖常规 unit test；仅在定位失败、比较 runner 差异或 coverage 本身阻塞时额外运行 `pnpm run test`，并说明原因。
- `pnpm run verify:architecture` 依赖编译产物，必须在 `build` 后运行；既要核对 source layer、退役 common 残留和显式 capability imports，也要核对 production module graph，不能只把退出码当作完整架构审计。
- `docker compose config --quiet` 如因必填插值变量缺失而无法运行，可使用仅为解析配置生成的临时高熵占位值；不得读取、覆盖或回显真实部署秘密。仍无法安全提供时记为 `Blocked`。
- `pnpm run audit:prod` 依赖外部漏洞数据库；网络或 registry 失败属于 `Network`，不是“零漏洞”。审计命中必须核对是否为 production 依赖、受影响版本、可达性和已知修复路径。
- `verify:openapi`、切片 e2e、完整 `AppModule`、真实依赖集成和 production entry 各证明不同层次，任何一个通过都不得替代其他层次。

`pnpm run build` 成功后必须检查 `verify:artifact` 的覆盖范围并人工只读核对实际产物，不得只相信退出码：

- `dist/src/main.js` 与生产启动命令一致。
- `dist/config/config.yaml`、`dist/config/typeorm.data-source.js` 和运行时配置导入可解析。
- entity 与 migration 的实际输出路径能被 TypeORM runtime/CLI glob 命中，并分别证明 production 只发现应用迁移、development/test/provision 额外发现 Feature-owned Demo migration。
- spec、source map、生成 metadata、静态资源和 production dependencies 是否符合 Docker/部署方式。

### 6.3 条件深度验证与双重安全门

以下命令必须进入结果矩阵，但默认不得执行：

```bash
docker build --tag gnester-lite:ci .
pnpm run verify:docker-image
pnpm run verify:migrations
pnpm run test:full-app
pnpm run verify:production-start
```

Docker build/run 只有在调用者明确允许写入本地 Docker image/cache、Docker daemon 可用且不会操作远端环境时执行。

后三个基础设施命令只有同时满足以下条件才可执行：

1. 调用者已明确确认目标是隔离、loopback、可丢弃的本地或 CI MySQL/Redis；“完整审计”四个字本身不构成破坏性操作授权。
2. 必须通过项目 `scripts/run-destructive-integration.mjs` 的 fail-closed 门：显式 `GNESTER_ALLOW_DESTRUCTIVE_INTEGRATION=true`、loopback `DB_HOST`/`REDIS_URL`、合法 `DB_PORT`、显式测试凭据，且数据库名以 `_test`、`-test`、`_ci` 或 `-ci` 结尾。
3. 授权和目标值必须来自本次明确提供的父进程环境，不得为获得通过而从 dotenv、shell history 或部署配置中搜集真实凭据。
4. 必须先完成 `test:integration-policy` 与 build/artifact 验证，再按 migration round-trip → full AppModule → production entry smoke 的顺序执行。

任一条件不满足时，分别记为 `Blocked`，说明缺少的条件以及它限制 D9、D10、D14、D15 中哪些结论。不得改用裸 TypeORM 命令、关闭安全检查或连接非 loopback 地址绕过门禁。

### 6.4 命令结果分类

每条命令只能使用：

- `Pass`：有效执行且退出码为 0。
- `Fail`：有效执行并确认项目检查失败。
- `Blocked`：缺少外部服务、权限、网络、Docker 或运行环境。
- `Skipped`：命令不适用、script 不存在，或会违反只读/安全边界。

附加失败类型：

- `Code`
- `Test`
- `Configuration`
- `Environment`
- `Network`
- `Tool invocation`
- `Unknown`

遇到 `Tool invocation` 时，先读错误并纠正一次；最终报告同时说明无效调用和有效重试，不把无效调用计入项目失败数量。

### 6.5 Coverage 分析

若 coverage 成功：

- 记录 statements、branches、functions、lines 总值。
- 核对 `package.json` 中当前 coverage thresholds 是否由实际命令强制执行；当前基线为 branches 40%、functions 70%、lines 75%、statements 70%，代码变化时以当前配置为准。
- 识别关键低覆盖文件，而不是只看总百分比。
- 重点核查 auth、authorization、upload、queue、schedule、database、bootstrap、config、安全 helper 和错误处理。
- 不自行提高阈值来制造失败；即使全局阈值通过，也必须报告关键安全/数据路径的低分支覆盖和无效断言风险。

若 coverage 失败：

- 记录根因。
- 继续根据测试文件、被测符号和断言做静态覆盖分析。

### 6.6 明确不执行

除非用户另行明确授权，不执行：

- `docker compose up`
- 绕过第 6.3 节封装直接执行 `pnpm migration:run`、`pnpm migration:revert` 或 TypeORM CLI
- `DB_SYNCHRONIZE=true` 启动
- 真正的外部写请求
- 长期 dev server、watcher 或监听器
- 任何 production/staging 数据库、Redis、队列、对象存储、Sentry 或第三方 API 的写入/探测

---

## 7. Phase 4 — 六分区审计

如果支持并行只读子任务，按可用并发槽位分批完成六个分区。主控不得把最终裁决完全委托出去，也不得因无法同时启动六个子任务而降低覆盖要求。

如果不支持并行，主控按 A → F 顺序执行，要求不变。

### 7.1 所有分区的统一输出契约

每个分区必须返回：

1. `Scope reviewed`：实际读取的目录、文件类型和关键符号。
2. `Checks completed`：完成了哪些检查。
3. `Candidate findings`：按统一 finding 字段返回。
4. `No-finding checkpoints`：已检查且未发现问题的高风险点。
5. `Unverified`：缺少环境或证据的部分。
6. `Coverage gaps`：因范围、工具或上下文未覆盖的部分。
7. `Mutation confirmation`：明确没有改文件。

子任务不得：

- 修改文件。
- 安装依赖。
- commit/push。
- 把未经复核的候选 finding 直接写入最终报告。
- 省略已检查范围。

### 7.2 分区 A — 完成度、架构与清晰度

检查：

- `AppModule`、bootstrap、`DemosModule`、各 feature/platform module 的装配关系。
- imports/providers/controllers/exports 是否最小且正确。
- 自定义 platform module 是否错误使用 `@Global()`，第三方动态根模块是否制造隐式依赖、重复注册或生产泄漏。
- `AppModule/bootstrap → platform + features + contracts`、`features → platform + contracts`、`platform → contracts` 的依赖方向和潜在循环依赖。
- `platform → features`、`contracts → bootstrap/platform/features` 是否被禁止，`src/common` 是否仍残留 TypeScript 实现。
- Controller/Gateway 只承担协议适配、输入边界和响应映射；不得直接承载核心业务编排、持久化细节或跨模块状态管理。
- Service/Application provider 承担用例与业务规则，但不得依赖 HTTP/Express/Socket.IO 请求对象等传输层细节，除非其职责明确属于适配层。
- Entity、migration 和数据库访问保持在持久化边界；DTO、公开响应和事件契约不得无意泄漏 ORM 实体、内部字段或敏感字段。
- 跨 feature 协作应通过模块公开 provider、稳定契约或事件完成；检查深层路径导入、绕过 exports、内部实现耦合和隐式共享状态。
- platform 层必须保持业务中立；不得反向引用 feature、Demo DTO、Demo entity 或仅服务某个示例的业务规则。
- contracts 层必须保持框架无关，不得导入 NestJS、Express、TypeORM、BullMQ、platform 或 feature 实现。
- 对每个代表性请求至少追踪一条完整链路：入口 → guard/pipe → controller/gateway → service → persistence/integration → response/error，标出职责越界和缺失层。
- platform 能力是否泄漏 Demo 专用类型或命名，feature 专属 DTO/事件/规则是否错误上移到 platform/contracts。
- 模块、service、controller/gateway、DTO、config、tests、docs 的能力闭环。
- 死导出、孤立 provider、不可达 controller、重复实现和注释掉的代码。
- 文件布局和邻近模块一致性。
- 过长类/函数、多重职责、深层条件、隐式状态和不必要抽象。
- TypeScript 严格性、显式 public 返回类型、`any`、类型断言和可空处理。
- 命名、布尔/复数规则、import 顺序、`console.log`、类型前缀。
- `normalize/parse/transform/convert/format/build/map` 命名禁令与实际业务语义。
- `AI modified:`、中英双语注释是否解释“为什么”，是否存在机械、错误或噪声注释。
- README/AGENTS 宣称的架构或严格度是否与配置一致。

### 7.3 分区 B — 正确性、可靠性与性能

检查：

- 每个公开方法的正常、空输入、边界、错误和取消路径。
- async/await、Promise rejection、Observable 完成/错误处理。
- 异常是否被吞掉、错误状态码是否误导、错误信息是否泄露内部细节。
- 内存状态、静态集合、计时器、流、连接、临时文件、订阅和 worker 的生命周期。
- 并发写、重复请求、重试、超时、取消、幂等和竞态。
- 单实例可用不等于多实例可用：核对内存状态、rate-limit、session、upload、SSE/WS 房间、scheduler 和 worker 在横向扩容、滚动重启、摘除 readiness 与 drain 时的语义；若仓库明确限定单机，只按文档准确性和生产定位判断。
- 缓存 key 的 environment/tenant/user/permission 隔离、HTTP `Vary`/Cache-Control、TTL 单位、失效竞态、缓存穿透/击穿、序列化版本及 Redis 故障语义。
- Queue 按 at-least-once 语义核对 job schema/version、dedup/jobId、重试/backoff、stalled/lock、毒丸任务、重复消费、processor 幂等、flow 部分失败、失败保留/replay 和优雅 drain；不得要求无法保证的“exactly once”。
- Schedule 多实例重复执行、重叠执行、时区、动态 job 清理和禁用开关。
- Event listener 错误传播、异步监听、重复注册、顺序和审计日志边界。
- HTTP client timeout、redirect、body 限制、错误映射和外部响应校验。
- Upload MIME/扩展名/大小、分片顺序、并发 finalize、路径安全、临时文件清理。
- Streaming/SSE 在断连、错误、取消和慢客户端下的清理与背压。
- WebSocket 握手、房间状态、重复加入、断连清理、ack/error 契约。
- TypeORM 查询、稳定分页、批量操作、事务、唯一性、并发更新和 N+1 风险；同时核对 charset/collation、timezone、decimal/bigint 精度、连接池、query timeout 和 deadlock 语义是否与模板声明匹配。
- 阻塞事件循环的同步 CPU/文件操作、无界集合或响应、缺失分页/限额、大对象复制、重复序列化和不受控并发。
- HTTP/WS/SSE/upload/streaming 的 body、buffer、连接、事件频率、慢消费者、临时磁盘与总量上限，以及 outbound HTTP 的 DNS rebinding、redirect 后 SSRF 和级联 timeout budget。
- 滚动发布期间旧/新实例共存时的 DB schema、queue payload、event、cache value、JWT 与加密数据兼容；没有历史版本基线时只能列为 `Needs Verification`，不能虚构 breaking change。
- 对高流量或高成本路径区分“已证实性能缺陷”和“需压测验证的容量风险”；没有测量不得声称具体性能提升或退化幅度。
- 启动失败、部分依赖故障和优雅关停行为。

### 7.4 分区 C — 安全与供应链

检查：

- Local/JWT strategy、`LocalAuthGuard`、`JwtAuthGuard` 与手写 `AuthGuard` 的语义差异。
- JWT algorithm、issuer、audience、expiration、secret fallback、payload 校验和错误行为。
- `@Public()` 范围、guard 顺序、未认证/错误/过期 token。
- roles/permissions/policies 元数据、组合逻辑、默认拒绝和绕过面。
- 对象所有权和多租户边界：IDOR、跨用户/房间 cache、job 状态越权、授权与写入之间的 TOCTOU；必须证明攻击者可控标识及生产可达链路后才能定性。
- 密码哈希算法、参数、比较时序、Demo 凭据边界。
- JWT/HMAC/encryption/cookie/session secrets 的独立性、强度、轮换/撤销、旧 key 兼容、clock skew 和丢失恢复边界；未承诺 refresh/revocation 时不得机械判缺陷。
- CSRF token/cookie/header、豁免路径、错误 handler 和 session/cookie 配合。
- CORS origin、credentials、wildcard、headers、methods、生产校验。
- Cookie/Session 的 httpOnly、secure、sameSite、签名、固定攻击、MemoryStore 生产保护。
- Helmet、安全响应头、`trust proxy` 与限流 IP 识别。
- ValidationPipe whitelist、forbidNonWhitelisted、transform 与 DTO 嵌套校验。
- 注入、SSRF、开放重定向、路径穿越、原型污染、恶意文件、资源耗尽。
- 日志、Sentry、异常、测试夹具、Docker、文档中的 token/密码/密钥/PII。
- 示例秘密是否明确且不可能被误用于生产。
- 依赖漏洞、废弃包、锁文件一致性、直接/间接依赖风险。
- package lifecycle scripts、pnpm allow-builds、许可证、GitHub Actions 权限/固定 SHA、fork PR secrets、缓存污染、SBOM/provenance/镜像扫描等供应链边界；缺少企业级能力只有在项目承诺或风险模型要求时才定级。
- Docker 基础镜像、Alpine/native compatibility、build context、运行用户、PID 1/信号、运行时写权限、read-only/rootfs/capabilities 责任边界、文件权限、攻击面和 secret 注入方式。

不得仅凭字符串命中就定性泄密；必须核对上下文、可达性和生产路径。

### 7.5 分区 D — 测试与验证质量

检查：

- 非平凡实现与 spec 的配对情况。
- 测试是否断言行为而非只断言 provider 存在。
- happy path、400/401/403/404/409/429/500、超时、重试和资源清理。
- Mock 是否隔离正确边界，是否让测试绕过真实逻辑。
- 永远为真的断言、过弱 expect、异常未 await、错误 snapshot、残留 timer/handle。
- 时间、随机数、端口、文件系统、网络和环境变量导致的 flaky 风险。
- `NODE_ENV=test` 是否误连真实依赖或掩盖生产装配问题。
- e2e 是否调用 `configureApplication`，是否覆盖 versioning、middleware、guards、pipes、filters。
- 切片 TestingModule 与完整 `AppModule` 行为差异。
- 至少区分并报告：纯单元测试、切片 e2e、完整 `AppModule` e2e、真实 MySQL/Redis 集成测试；不得互相冒充。
- MySQL/Redis、database/cache/queue 的真实集成是否在 CI 中被验证。
- `test:integration-policy` 只验证破坏性脚本安全门；`test:full-app` 验证真实模块装配；`verify:production-start` 验证编译后 production 入口；分别核对其断言范围和盲区。
- `verify:openapi` 自动发现编译 controller 并验证生成契约，但不能单独证明 environment module graph、bootstrap 可达性或运行时 response body。
- WebSocket/SSE/CSRF/rate-limit/auth 的跨模块契约覆盖。
- config/template contract、Docker/CI/start:prod 路径是否有测试保护。
- coverage 总值、当前阈值是否被强制、关键文件低分支覆盖和“阈值通过但关键路径未测”的风险。
- 测试数量必须从实际输出读取，不沿用历史状态文件中的数字。

### 7.6 分区 E — 文档与契约一致性

检查：

- README 要求、Quick Start、脚本、端口、路由、健康检查和文档地址。
- `package.json` scripts、README、AGENTS、CI 命令是否一致。
- MySQL、Redis、env、migration 是否被首次启动流程真实覆盖。
- `docs/project-notes.zh-en.md` 是否完整映射 bootstrap/platform/features/contracts，链接是否有效。
- 每份专题文档与真实模块、DTO、配置键和运行行为。
- 文档中 HTTP method/path/body/response/status code 是否与 controller/DTO 一致。
- `VERSION_NEUTRAL` 与 `/v1` 示例是否正确。
- OpenAPI decorators、DTO schema、认证声明和运行路由是否一致。
- AsyncAPI channel、message schema、事件名和 Socket.IO gateway 是否一致。
- 若可安全生成 OpenAPI/AsyncAPI 文档，比较生成结果与 controller/gateway/DTO；只检查 setup 函数不等于契约已验证。
- Compodoc 命令与输出路径是否可用。
- YAML 默认值与 env 密钥的职责是否被正确区分。
- 安全警告、Demo 凭据、生产 session、CORS/CSRF、Docker 示例值是否说明充分。
- 安装/升级/迁移/回滚、backup/restore、key rotation、Redis durability、queue replay、水平扩容限制、反向代理/TLS/timeout、故障排查和 Demo 移除是否按“production-oriented”定位说明；仓库已明确交由部署平台负责的事项不得机械判代码缺陷。
- “文档有代码无”“代码有文档无”“旧路径/旧命令/死链接”。
- 中英双语内容是否准确，是否出现机械翻译或无信息量模板句。

专题文档可以替代 `docs/demo.md` 的独立章节；判断标准是能力能否被发现、理解和正确运行，而不是强求每个 Demo 重复写两份文档。

### 7.7 分区 F — 配置、数据、可观测性、交付与 DX

检查：

- `config.yaml`、YAML validator、env validator、config types、使用方和文档一致性。
- 默认值、隐式类型转换、required/optional、范围校验和生产条件校验。
- `NODE_ENV`、env file 加载顺序和测试污染。
- development/test/provision/production 四种环境的 module graph、校验、dotenv、Sentry、queue/schedule 和可达路由是否形成明确且相互隔离的矩阵。
- 配置构建后路径、`dist/config` 资产复制和 `start:prod` 解析。
- TypeORM runtime/CLI 配置、entity glob、migration glob、`Relation<T>`。
- development/test/provision/production 的 migration 发现集合是否符合 true opt-in Demo 边界；不得把“旧生产 Demo 表仍存在”误判为当前 production 数据源仍会发现 Demo migration。
- migration 与实体一致性、生产 `DB_SYNCHRONIZE=false`、Docker 启动前迁移路径。
- `CreateDemoTable1760000000000` 类名/`name` 是否保持稳定，已有生产表和 migration history 不会因路径移动被自动 drop 或改写。
- migration clean install、up/down/up、滚动发布兼容、长锁风险、失败恢复、备份/恢复责任和多副本迁移竞争；没有部署历史或数据规模证据时降低置信度。
- MySQL/Redis 是硬依赖还是可降级依赖，文档是否准确。
- Redis 同时承载 cache 与 BullMQ 时的 persistence/eviction/隔离和灾难恢复语义；缓存允许丢失不能外推为 queue job 允许丢失。
- liveness/readiness 是否覆盖真实关键依赖；Redis 故障时语义是否合理。
- shutdown 时是否先变为 unready、再停止接流量并 drain HTTP/WS/SSE/worker；容器 stop grace 与应用关停 deadline 是否匹配。
- `enableShutdownHooks`、连接/worker/scheduler/stream 的关停。
- Pino 级别、结构、request ID、redaction、health log 排除和错误堆栈。
- request/trace ID 是否跨 HTTP、DB/Redis、queue/event、WebSocket 传播；日志/Sentry 是否覆盖 header、cookie、query、URL、body、nested error 的脱敏并控制高基数字段。
- Sentry 初始化顺序、environment/release、环境开关、PII、sample rate、重复捕获、后台 isolation 和 shutdown flush；metrics/alerts/SLO 缺口按项目生产承诺判断。
- Dockerfile 多阶段构建、生产依赖、用户权限、healthcheck、迁移和镜像可复现性。
- docker-compose 依赖健康、volumes、端口、示例秘密和生产误用风险。
- CI Node/pnpm 版本、frozen lockfile、lint/test/build/e2e 顺序、services、coverage 和 artifact。
- CI 临时 secrets、最小权限、外部 action/container 固定、peer/artifact/OpenAPI/image/migration/full-app/production-start gates 的顺序和 fail-closed 行为。
- `package.json` 的 name/version/description/author/license/private/engines/packageManager 与模板用途、Node 24 声明和交付方式是否一致。
- 生产 source map、容器非 root 用户、容器级 healthcheck、迁移入口和优雅关停是否有明确策略。
- 从全新 clone 到 dev/test/build/start:prod 的文档可执行性。
- `.env.example` 或等价配置模板、错误提示、调试入口和模板移除 Demo 的清晰度。

---

## 8. 十五维度强制检查清单

六个分区完成后，主控必须逐项确认以下 15 个评分维度都有证据。任何空维度都代表审计未完成。

### D1. 模板能力完成度

- platform/bootstrap + feature/docs/tests/config 闭环。
- 模块已接入且真实可达。
- Demo 能说明正确使用方式而非空壳。
- 缺失项与 Not Applicable 明确区分。

### D2. 功能正确性与错误处理

- 正常、边界和失败路径。
- 状态码、异常传播、异步错误。
- 资源生命周期和取消。
- 无误导性成功或静默失败。

### D3. 认证与授权

- Local/JWT/手写认证路径一致性。
- token 生命周期与 claims。
- Public/roles/permissions/policies 组合。
- 对象所有权、跨用户/租户/房间隔离和 TOCTOU。
- 401/403 边界和默认拒绝。

### D4. HTTP 与会话安全

- CSRF、CORS、Cookie、Session。
- Helmet、trust proxy、rate limit。
- 开发默认与生产强制约束。
- 安全配置和文档一致性。

### D5. 输入、网络、文件与秘密安全

- DTO、ValidationPipe、注入和 SSRF。
- 上传、路径、MIME、大小和资源耗尽。
- 日志/Sentry/异常中的秘密与 PII。
- 依赖和容器供应链风险。

### D6. 架构与依赖边界

- bootstrap/platform/features/contracts 分层及允许的依赖方向。
- DI、imports/providers/exports。
- 自定义 platform `@Global()`、显式 capability imports 与第三方动态根模块的重复注册。
- 退役 `src/common` 残留、`platform → features` 和 contracts 框架依赖。
- Controller/Gateway、Service/Application、Persistence/Integration 的职责边界。
- DTO、事件契约、领域对象和 ORM Entity 的边界与泄漏。
- 循环依赖、跨 feature 深层导入、平台层泄漏和模块职责。

### D7. 类型、清晰度与可维护性

- TypeScript 严格选项与项目宣称一致。
- `any`、断言、可空和显式返回类型。
- 命名、注释、复杂度、重复和死代码。
- 邻近模块风格与职责一致。

### D8. 配置正确性

- YAML/env/types/usage/docs 多向一致。
- 默认值、转换、范围和生产条件。
- env 加载顺序和测试隔离。
- 构建后配置资产可解析。

### D9. 数据库与迁移

- entity、relation、index、constraint。
- 查询、分页、事务和并发。
- migration 与实体一致。
- clean/upgrade/rollback、CLI、生产启动和 Docker 迁移流程。
- 备份恢复、滚动发布兼容和多副本迁移责任边界。

### D10. 异步与集成可靠性

- Cache/Queue/Schedule/Events。
- HTTP/Upload/Streaming/SSE/WebSocket。
- 幂等、竞态、超时、重试、背压和清理。
- 多实例和部分依赖故障语义。

### D11. 测试覆盖与质量

- 源码—spec 配对。
- 失败路径和真实行为断言。
- e2e 装配深度。
- coverage、flaky、mock 和外部依赖隔离。

### D12. API 与文档契约

- HTTP/WS 路由、版本、DTO、状态码。
- OpenAPI/AsyncAPI。
- README、专题文档、project notes。
- 命令、环境变量、链接和示例。

### D13. 可观测性与健康检查

- Pino、Sentry、redaction、request context。
- 后台任务 isolation。
- liveness/readiness 与真实依赖。
- 跨传输 correlation、metrics/alerts/SLO 与敏感字段治理。
- 启动、运行、关停故障可诊断性。

### D14. 构建、交付与仓库卫生

- lint/test/build/e2e/Compodoc。
- Dockerfile、Compose、CI、start:prod。
- lockfile、依赖漏洞、生成物、gitignore。
- Actions/container 固定、最小权限、build scripts、许可证和供应链边界。
- 无秘密、无无效脚本、无发布阻断。

### D15. 开发者体验与生产就绪度

- 全新环境可按文档启动。
- MySQL/Redis/env/migration 前置明确。
- Demo 可发现、可移除、可学习。
- 单机/多副本限制、升级回滚、备份恢复、密钥轮换、故障处理等生产边界清晰。
- 生产限制、扩展点和人工决策清晰。

---

## 9. 必须重点核查但不得预设结论的热点

以下只是审计入口，不是预先认定的缺陷：

1. Passport JWT guard 与手写 `AuthGuard` 是否形成双轨语义。
2. Redis 是 cache/queue 依赖时，readiness 是否反映真实可用性。
3. Demo/health 的 `VERSION_NEUTRAL` 与根路由默认 `/v1` 是否被测试和文档正确表达。
4. 切片 e2e、full-app integration 与 production-start smoke 各自是否复用真实 `AppModule` / `configureApplication`，以及它们仍未证明什么。
5. 非平凡 service/guard/listener/processor 是否存在有效测试缺口。
6. `queue.enabled`、`schedule.enabled` 是否控制注册、执行还是仅控制业务行为，文档是否一致。
7. 生产 session MemoryStore 拒绝逻辑与默认配置是否匹配。
8. Sentry 在 queue/schedule/events 等后台执行中的 isolation 和错误捕获。
9. Docker `DB_SYNCHRONIZE=false` 时 one-shot migration 是否真实先于 app、是否支持失败恢复并避免多副本竞争。
10. README Quick Start 是否遗漏 MySQL、Redis 和环境配置前置。
11. 项目宣称严格 TypeScript 时，`tsconfig` 实际严格选项是否匹配。
12. Docker/测试/文档中的示例凭据是否被清楚限定为示例。
13. 配置验证 helper、注释和命名是否符合仓库规则且表达真实意图。
14. test 环境特殊分支是否意外掩盖生产装配缺陷。
15. health、logger、Sentry、rate-limit、CSRF 和 WebSocket bootstrap 顺序是否正确。
16. 仓库声明严格 TypeScript 时，`tsconfig`、Nest SWC type-check、独立 `tsc` 和 ESLint 是否真正形成一致门禁。
17. 构建后的 migration/entity/config 路径是否与 TypeORM glob、`start:prod` 和 Dockerfile 一致。
18. 根路由 versioning、完整 `AppModule`、真实 MySQL/Redis 和生产 bootstrap 是否分别由有效断言验证，而不只是脚本存在。
19. 已跟踪 `.env.*`、Docker 示例秘密和文档占位值是否被安全限定，审计输出本身是否避免泄密。
20. production 排除全部 Demo 后，生产攻击面、README 路由、OpenAPI/AsyncAPI 可达性和健康检查是否一致。
21. OpenAPI verifier 扫描全部编译 controller，而 production module graph 排除 Demo；是否把“契约完整”误当成“生产路由可达”。
22. `provision` 与 destructive integration wrapper 是否 fail-closed、只接受 loopback disposable targets，且不会被 dotenv 或 CI 配置绕过。
23. 单实例内存状态、session、rate-limit、schedule、WebSocket/SSE 和 upload 在多副本/滚动关停下的限制是否明确。
24. 用户/权限相关响应缓存、queue job、WebSocket room 和对象访问是否存在跨身份隔离或 TOCTOU 风险。
25. 密钥轮换、migration/queue/event/cache schema 演进、backup/restore 和 rollback 是否有可验证边界；没有历史或运维基线时只能列为待验证。
26. 每个 `verify:*` 脚本本身的断言范围、假阳性/假阴性和 CI 调用前置是否被审计，不能用 verifier Pass 替代人工交叉核对。

对每个热点必须写出“已确认问题 / 设计合理 / 尚需验证”之一及证据。

---

## 10. Finding 模型

### 10.1 严重度

- `Blocker`：无法构建、启动或完成模板核心用途；或存在可直接利用的高危安全/数据问题。
- `High`：重要功能错误、安全边界失效、数据风险、生产发布阻断。
- `Medium`：可复现的非核心缺陷、重要可靠性/测试/文档缺口。
- `Low`：局部清晰度、可维护性、一致性或低影响 DX 问题。
- `Info`：非缺陷建议、合理权衡或未来增强。

严重度依据实际影响和可达性，不依据文件大小、个人偏好或修复难度。

任何 `Blocker`/`High` 必须同时给出适用环境与触发配置、生产/公开可达入口、完整调用链、实际影响，以及动态复现或足以闭合逻辑的强静态证据。缺少其中任一项时保留潜在严重度，但置信度必须降为 `Probable`/`Needs verification`，不能作为已确认发布阻断。对“缺失能力”还必须先证明仓库对该能力有明确承诺。

### 10.2 置信度

- `Confirmed`：命令或直接可追踪代码路径确认。
- `Probable`：静态证据强，但缺完整运行环境。
- `Needs verification`：合理风险，需要额外环境、负载或人工决策。

### 10.3 finding 类型

- `Defect`
- `Security`
- `Privacy`
- `Reliability`
- `Performance`
- `Data Integrity`
- `Configuration`
- `Supply Chain`
- `Test Gap`
- `Documentation Mismatch`
- `Architecture`
- `Maintainability`
- `Operational Gap`
- `DX`
- `Environment Blocker`
- `Accepted Design`

`Accepted Design` 和纯 `Environment Blocker` 不计入确认缺陷数量。

### 10.4 正式 finding 必填字段

每条使用唯一 ID：`GNL-AUD-001`、`GNL-AUD-002`……

必须包含：

```text
ID:
标题:
类型:
维度:
严重度:
置信度:
证据类型:
位置:
现象:
预期或判定依据:
影响:
根因:
复现/验证方法:
最小修复建议:
建议补充测试:
相关 finding:
```

规则：

- 位置必须是文件路径 + 行号/符号，或完整命令。
- `Assumed` 不得作为 `Confirmed` finding 的唯一证据。
- 同一根因影响多个文件时合并为一条，列出所有位置。
- 一个问题同时影响代码和文档时，主 finding 归主根因，交叉引用文档偏差。
- 仅风格偏好不得列为缺陷，除非违反明确规则或造成实际理解/维护风险。
- 无法复核的猜测放入“未验证风险”，不进入确认缺陷表。

---

## 11. 主控交叉验证与去重

六个分区完成后，主控必须：

1. 重新打开所有 Blocker/High 和代表性 Medium 的证据位置。
2. 核对行号、符号、可达路径和配置条件。
3. 对动态失败区分项目失败与环境/调用失败。
4. 合并同根因候选 finding。
5. 解决分区间结论冲突；不能解决时降低置信度并说明双方证据。
6. 检查每个能力矩阵行是否至少被一个分区深入审计。
7. 检查每个 15 维度是否有证据和评分理由。
8. 检查所有“无问题”结论是否来自明确检查，而非没有搜索到。
9. 如果某个分区失败或返回范围不完整，由主控顺序补做该分区。
10. 不得引用历史 self-audit 分数替代本次证据。

---

## 12. 评分规则

对 D1–D15 分别按 0–5 评分：

- `5`：覆盖充分，无实质问题，仅有 Info/Accepted Design。
- `4`：存在 Low，但无 Medium 及以上。
- `3`：存在 Medium，或该维度关键路径因环境未验证。
- `2`：存在 High，或多个重要路径未验证。
- `1`：存在 Blocker，或该维度大面积缺失。
- `0`：证据不足，无法进行有效审计。

约束：

- 每个分数必须附至少一条证据和一句扣分原因。
- 存在未验证关键路径时，对应维度最高为 3。
- 存在 High 时，对应维度最高为 2。
- 存在 Blocker 时，对应维度最高为 1。
- 不得为了“看起来完整”给满分。

总体成熟度不能只做简单平均：

1. 可以展示 15 项算术平均值，保留 1 位小数，仅作参考。
2. 另给出保守的 `Overall readiness`：
   - 任一 Blocker：最高 `1/5`
   - 无 Blocker但有 High：最高 `2/5`
   - 无 High但有 Medium或关键未验证：最高 `3/5`
   - 仅 Low：最高 `4/5`
   - 仅 Info/Accepted Design 且验证充分：`5/5`

同时给出发布判定：

- `Ready`：核心验证实际通过，无 Blocker/High，关键生产路径有充分证据。
- `Conditional`：无 Blocker/High，但存在重要 Medium、部分关键路径未验证或外部集成受阻。
- `Not Ready`：存在确认的 Blocker/High，或 CI/生产主路径因代码问题失败。
- `Unable to determine`：关键验证大面积受环境阻塞，证据不足以判断。

不得因为平均分较高覆盖更差的发布判定。

---

## 13. 完整报告格式

报告必须使用简体中文，并严格包含以下 12 个固定章节。

### 13.1 审计元数据、范围与限制

包括：

- 日期、环境、分支元数据。
- 审计对象为当前工作区。
- 已读取目录和排除项。
- 并行或顺序执行方式。
- 外部环境限制。
- 明确“未比较 HEAD、未修复代码”。

### 13.2 执行摘要

包括：

- 一句话结论。
- Overall readiness 与 15 项平均分。
- `Ready / Conditional / Not Ready / Unable to determine` 发布判定。
- Blocker/High/Medium/Low/Info 数量。
- 前 5 个最高风险。
- 分别给出声明完成度、示例完成度和生产完成度的结论，以及是否具备“模板可学习”“本地可验证”“生产可部署”的证据。
- 不能下结论的关键盲区。

### 13.3 环境与验证命令矩阵

使用：

| 命令 | 状态 | 退出码 | 耗时 | 失败类型 | 证据摘要 |
| ---- | ---- | -----: | ---: | -------- | -------- |

不得省略失败、Blocked 或 Skipped 命令。

### 13.4 十五维度评分卡

使用：

| 维度 | 分数 | 最高严重度 | 证据摘要 | 主要扣分原因 |
| ---- | ---: | ---------- | -------- | ------------ |

必须列满 D1–D15。

### 13.5 全量能力矩阵

使用第 5.2 节字段。矩阵每行必须有状态和证据，不允许空白，并汇总 Complete / Partial / Demo Only / Missing / Blocked / Not Applicable 数量。

默认不输出虚构的“项目完成度百分比”。若确有需要，只能按预先公开且可复算的分母、状态权重和公式分别计算声明/示例/生产完成度；Blocked 与 Not Applicable 的处理必须披露，不能用文件数量或主观印象配分。

### 13.6 详细 Findings

按 `Blocker → High → Medium → Low → Info` 排序。

每条使用第 10.4 节完整字段。没有某一严重度时明确写“无”。

另设：

- `Accepted Design`
- `Environment Blockers`
- `Needs Verification`

不得把三者混入确认缺陷数量。

### 13.7 测试与 Coverage 分析

包括：

- unit/e2e suites 与 test cases 实际数量。
- coverage 总值和关键低覆盖文件。
- 源码—spec 配对缺口。
- 失败路径、Mock、flaky 和假阳性风险。
- 完整应用装配与切片 e2e 差异。
- CI 中未覆盖的真实依赖路径。

### 13.8 代码、配置、API 与文档不一致项

逐条列出：

- 声明来源。
- 实际实现。
- 哪一方可能过时。
- 用户影响。
- 修正建议。

### 13.9 横切风险

至少总结：

- 架构边界。
- 代表性请求链路与分层违规表。
- 安全。
- 数据与异步可靠性。
- 可观测性。
- 部署与运维。
- 模板维护成本。

### 13.10 未验证项、环境阻塞与剩余盲区

每项说明：

- 未验证原因。
- 受影响结论。
- 当前最高可给置信度/分数。
- 后续验证所需环境或人工决定。

不得用“应当没问题”收尾。

### 13.11 分阶段修复路线图

只建议，不实施：

- Phase 0：Blocker/High 与安全/数据风险。
- Phase 1：Medium、关键测试和契约偏差。
- Phase 2：Low、清晰度、文档与 DX。
- Human Decisions：公共 API、auth/authz、数据库 schema、大重构等需确认项。

每项引用 finding ID、预期收益、风险和验证方式。

### 13.12 附录

包括：

- 文件/模块/测试/文档计数。
- 六分区实际覆盖范围。
- 重点搜索与命令摘要。
- 能力矩阵中 Not Applicable 的理由。
- 本次产生的被忽略验证产物。
- mutation guard 结果。

---

## 14. 审计完成门槛

以下条件必须全部满足，才能说“审计完成”：

- [ ] 已盘点 `src/bootstrap`。
- [ ] 已盘点 `src/platform`。
- [ ] 已盘点 `src/features`。
- [ ] 已盘点 `src/examples`。
- [ ] 已盘点 `src/contracts`，并核对其框架无关约束。
- [ ] 已确认退役 `src/common` 没有 TypeScript 实现残留。
- [ ] 已盘点 production 可发现的 `src/migrations`、正式 Feature-owned migrations 以及 Example-owned migrations，并分别重建四种环境的迁移发现集合。
- [ ] 已盘点 `config`。
- [ ] 已盘点 `test`。
- [ ] 已盘点 `docs`。
- [ ] 已盘点 `scripts`、`prompts` 与 `.github`。
- [ ] 已盘点根级构建、TypeScript、SWC、Jest、lint/format 配置。
- [ ] 已盘点 CI、Dockerfile、docker-compose 和生产启动路径。
- [ ] 已分别重建 development/test/provision/production module graph 与可达能力。
- [ ] 能力矩阵每一行都有状态、证据和缺口说明。
- [ ] 六个审计分区全部完成；失败分区已由主控补做。
- [ ] D1–D15 均有分数和证据。
- [ ] 当前 `package.json`/CI 的每个门禁及第 6.3 节条件命令都有 Pass/Fail/Blocked/Skipped 状态。
- [ ] `verify:architecture` 已在 build 后执行，并人工核对其 source boundary、显式 capability import 与 production module graph 覆盖范围。
- [ ] production+test TypeScript 检查及 build/artifact/OpenAPI 路径核对已有状态和证据。
- [ ] 已区分 unit、切片 e2e、完整 AppModule e2e 和真实外部集成的验证深度。
- [ ] 已分别报告项目完成度与审计覆盖率。
- [ ] 所有正式 finding 均有路径/命令证据。
- [ ] Blocker/High 已由主控独立复核。
- [ ] 候选 finding 已去重并解决冲突。
- [ ] 已区分缺陷、风险、环境阻塞、设计权衡和建议。
- [ ] 未验证关键路径已降低置信度和评分。
- [ ] 已核查第 9 节全部项目热点。
- [ ] 完整报告已写入唯一目标路径。
- [ ] 除报告和被忽略生成物外，未修改既有项目文件。
- [ ] 未 commit、未 push。

只要任一项未满足：

- 不得写“完整审计已全部通过”。
- 在报告中明确标记 `Audit incomplete`。
- 列出缺失步骤、原因和完成它所需条件。

---

## 15. Mutation Guard

写报告前后检查：

1. 本次主动写入是否只有目标报告。
2. `dist/`、`coverage/`、`documentation/`、`src/metadata.ts` 等是否为本轮验证生成物；哪些在审计前已存在。
3. 是否意外改动了 lockfile、源码、配置、测试或现有文档；用开始/结束状态比较，不把审计前的 dirty worktree 归因给本轮。
4. 单独披露 `node_modules`、Docker image/cache 和临时目录等 Git 无法反映的允许副作用。
5. 若发现意外改动，不得擅自覆盖用户原有文件；停止进一步写入，在聊天和报告中说明路径及原因。

不要用 reset/checkout 恢复，因为当前工作区可能已有用户改动。

---

## 16. 聊天最终回复格式

保持简短，只输出：

1. **总体结论**：Overall readiness、最高严重度、是否存在 Blocker/High。
2. **验证结果**：通过/失败/阻塞/跳过数量及最重要失败。
3. **最高风险**：最多 5 条，含 finding ID 和路径。
4. **限制**：最关键的未验证项。
5. **完整报告**：实际文件路径。
6. **文件安全**：确认除报告和被忽略生成物外是否有改动。

所有结论继续标注 `Executed` / `Inspected` / `Assumed`。

禁止在聊天里粘贴整份报告；完整细节写入报告文件。
