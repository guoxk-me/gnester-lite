# 2026-07-27 代码一致性迭代计划

## 目标

本计划聚焦下一迭代的代码统一整理。排序原则不是“先批量改格式”，而是先让质量门禁真实反映仓库状态，再处理安全与运行契约，最后进行可机械化的风格清理。

状态标签：

- **Executed**：已通过命令实际执行验证。
- **Inspected**：已直接检查当前代码。
- **Assumed**：需要运行环境、业务策略或负责人确认。

## 结论摘要

1. Helmet 注册方式已经统一。`src/bootstrap/configure-application.ts` 直接使用 `app.use(helmet(createHelmetOptions(nodeEnv)))`，旧的 Helmet 包装中间件已不存在。
2. 当前最严重的“一致性”问题不是空格或命名，而是质量门禁覆盖不一致：CI 可以全绿，但完整 TypeScript 检查仍有 53 个错误。
3. 安全行为存在多套契约：JWT、CSRF、HTTP/Socket.IO CORS、健康检查与限流分别有不一致或未明确的边界。
4. 配置、构建产物和部署契约仍有漂移，最明确的例子是迁移文件 glob 与实际构建目录不一致。
5. 机械式双语注释已经淹没业务意图，应分模块清理，但不应与安全行为修改放在同一批变更中。

## 已完成项

### Helmet 直接注册

**状态：Executed + Inspected**

- 当前实现：`src/bootstrap/configure-application.ts:44`
- 注册方式：`app.use(helmet(createHelmetOptions(nodeEnv)))`
- 中间件顺序集中在 `configureApplication`，`src/main.ts` 只负责创建、配置和监听应用。
- 旧的 `security.middleware.ts` / `applySecurityMiddleware` 已不存在。
- 聚焦验证通过：2 个测试套件、5 个测试，包括 Helmet 配置和共享启动管线顺序。

这项无需再创建新的抽象。后续只需保持所有 Express 中间件通过共享启动管线注册。

## P0：先修复门禁和明确的运行风险

### 1. 建立可信的 TypeScript 门禁

**状态：Executed + Inspected**

当前证据：

- `pnpm run lint:check` 通过。
- `pnpm run test` 通过：84 个套件、349 个用例。
- `pnpm run build` 通过：SWC 编译 322 个文件，构建类型检查 0 个问题。
- `pnpm run test:e2e` 通过：4 个套件、10 个用例。
- 但 `pnpm exec tsc --noEmit --incremental false` 失败，共 53 个错误：
  - 11 个来自 `.gitignore` 已忽略、但根 `tsconfig.json` 未排除的 `documentation/template-playground`。
  - 42 个来自 spec/e2e 的 mock、断言和测试夹具类型错误。
- 使用 `--strict` 检查时有 390 个错误，说明严格模式仍有较大存量债务。
- 其中 334 个是 `TS2564` 属性未初始化，分布于 81 个文件：DTO 296 个、配置类 35 个、Entity 3 个。

根因：

- Nest 构建使用 `tsconfig.build.json`，排除了测试和 `documentation`。
- Jest 使用 `@swc/jest`，只转译测试，不执行 TypeScript 类型检查。
- `package.json` 没有独立的 `typecheck` 脚本，CI 序列也没有完整仓库类型检查。
- `tsconfig.json` 只开启部分严格规则，并明确关闭 `noImplicitAny`、`strictBindCallApply` 和 `noFallthroughCasesInSwitch`。
- ESLint 关闭 `no-explicit-any`，并把 `no-floating-promises`、`no-unsafe-argument` 降为 warning。

迭代动作：

1. 为应用源码与测试建立明确的 tsconfig 边界，根检查排除生成目录但包含 spec/e2e。
2. 增加只读 `typecheck` 脚本，并加入 CI。
3. 先把当前配置下的 42 个测试类型错误归零，再分阶段提升严格规则。
4. 将禁止 `any`、未处理 Promise 和 unsafe argument 与项目规则对齐；先修存量，再升级为 error。
5. 明确 class-transformer/class-validator DTO 的属性初始化写法，避免通过关闭 strict 掩盖框架约定。

验收：

- `pnpm run typecheck` 为 0 错误。
- 构建、单测、E2E、lint 继续通过。
- CI 中明确区分“生产构建类型检查”和“全仓库类型检查”。

### 2. 修复生产依赖高危漏洞

**状态：Executed**

`pnpm audit --prod --audit-level high` 当前失败：

- 58 个漏洞
- 2 critical
- 28 high
- 25 moderate
- 3 low

高风险链路主要经过 `nestjs-asyncapi` 及其生成器依赖；当前直接依赖 `axios` 也命中 high 漏洞区间。

迭代动作：

1. 按直接依赖、运行时可达性和修复版本拆分，而不是一次无边界升级全部包。
2. 优先处理 critical/high；无法立即升级的链路记录可达性、临时缓解和负责人。
3. 将生产依赖审计加入固定 CI 或依赖更新流程。

验收：

- critical/high 为 0，或每个例外都有明确、限时的风险接受记录。

### 3. 修复迁移产物路径契约

**状态：Executed + Inspected**

- 配置期望：`config/database.config.ts:5` 使用 `dist/migrations/*.js`。
- 实际构建产物：`dist/src/migrations/1760000000000-CreateDemoTable.js`。
- Compose 关闭 synchronize，最终镜像只启动应用；当前 `migration:run` 又依赖源码 data source 和开发依赖，因此生产镜像没有闭合的迁移执行路径。

这会导致生产启动后找不到编译后的迁移。应统一 Nest 构建目录、TypeORM runtime glob、CLI glob 和部署迁移命令，并增加一次基于构建产物的迁移发现测试。

验收：

- 构建后 TypeORM 能发现预期迁移。
- 部署流程明确执行迁移，且不依赖 `DB_SYNCHRONIZE=true`。

### 4. 增加日志敏感字段脱敏

**状态：Executed + Inspected**

`src/common/logger/logger.config.ts:90-109` 配置了 level、transport 和 auto logging，但没有 Pino `redact`。请求头、Cookie、Authorization 和可能的用户输入存在进入结构化日志的风险。

定向执行已确认当前 request serializer 会保留 Authorization 和 Cookie 原值；`quietReqLogger` 不能替代脱敏。

验收：

- 至少覆盖 Authorization、Cookie、Set-Cookie 和项目确认的敏感 body 字段。
- 单测验证原始敏感值不会出现在日志输出中。

## P1：统一安全与运行契约

以下事项会改变认证或安全行为，实施前需要负责人确认策略，不应在纯风格 PR 中顺手修改。

### 1. JWT 校验路径不一致

**状态：Executed + Inspected**

- Passport JWT strategy 在 `src/common/auth/strategies/jwt.strategy.ts:13-21` 校验 secret、issuer 和 audience。
- 自定义 HTTP guard 在 `src/common/auth/auth.guard.ts:41-43` 只调用 `verifyAsync(token)`。
- WebSocket 在 `src/examples/demo-websocket/demo-websocket.service.ts:67-76` 同样只调用 `verifyAsync(token)`。

应选择唯一认证入口或共享明确的验证选项，保证 HTTP 与 WebSocket 对同一 token 得出相同结论。

定向执行已确认：带错误 `iss` / `aud` 的 token 可被无 options 的 `verifyAsync` 接受，而传入明确约束时会被拒绝。

### 2. CSRF 保护范围未表达认证模型

**状态：Inspected + Assumed**

`configureApplication` 全局注册 CSRF middleware；`CsrfService` 对所有 unsafe method 生效，除非全局关闭。Bearer API、cookie/session API、登录端点和 webhook 是否需要 CSRF 没有通过元数据或路由策略表达。

需要先确认项目支持的客户端与认证方式，再决定：

- 只保护依赖浏览器 Cookie 的写操作；
- 或维持全局保护，并为明确的非浏览器入口建立审计过的例外。

### 3. HTTP 与 Socket.IO CORS 来源不同

**状态：Inspected**

- HTTP CORS 通过配置服务和环境变量生成。
- `src/common/websocket/demo-socket-io.adapter.ts:11-16` 硬编码 localhost origin，并在 `:35-38` 固定 `credentials: true`。

应共享同一 origin 策略或明确区分两者的业务理由，不能让生产 WebSocket 策略依赖示例默认值。

### 4. 健康检查与限流/就绪依赖不一致

**状态：Inspected**

- `CommonRateLimitModule` 通过全局 `APP_GUARD` 注册 `ThrottlerGuard`。
- `HealthController` 没有 `@SkipThrottle`，尽管 demo 文档代码明确建议健康探针跳过限流。
- readiness 只检查数据库，没有检查 Redis；而 cache/queue 依赖 Redis。
- logger 使用 `url.includes('/health')` 忽略探针日志，会同时误匹配任何路径中包含 `/health` 的业务请求。

需要定义“服务可接流量”的真实条件，再决定 readiness 指标。若 Redis 功能可选，检查也应与功能开关一致。

### 5. 增加真实启动链路的 smoke test

**状态：Inspected**

- `test/csrf.e2e-spec.ts` 已复用 `configureApplication`。
- `test/app.e2e-spec.ts` 仍创建裁剪后的测试模块，未使用 `AppModule` 和完整启动管线。

保留小型 E2E 的同时，增加一个可控依赖下的 `AppModule + configureApplication` smoke test，覆盖模块组合、全局 guard/filter/pipe 和中间件顺序的真实集成。

### 6. 收敛生产配置与功能开关语义

**状态：Inspected**

- `DB_HOST`、`DB_USERNAME`、`DB_PASSWORD`、`DB_DATABASE` 在生产仍是 optional；缺失时会静默使用 localhost/root/空密码/test。
- `queue.enabled=false` 只阻止 service mutation，不阻止 BullMQ root、Redis connection、processor 和 demo module 注册。
- queue 默认 job options 同时存在于 root module 和 demo service。
- YAML、验证 class、接口和消费者分别重复声明配置形状与默认值。

应先定义“配置校验是唯一入口”和“feature disabled 必须阻止哪些生命周期行为”，再消除重复默认值。生产必需配置应 fail fast。

### 7. 补齐进程生命周期契约

**状态：Inspected**

`src/main.ts` 没有调用 `app.enableShutdownHooks()`。对 TypeORM、Redis、BullMQ 和定时任务并存的服务，应验证 SIGTERM 下能停止接流量、释放连接并在超时内退出。

## P2：代码风格与可读性整理

### 1. 清理机械式双语注释

**状态：Executed**

当前 `src`、`config`、`test` 共 326 个 TypeScript 文件：

- 313 个文件包含 `CN:` / `EN:` 注释。
- 共 1293 行此类注释。
- 55 处 `AI modified:` 注释。

大量注释只是复述类名、方法名或测试动作，例如“初始化依赖”“执行业务逻辑”“测试用例”，没有解释约束或原因。它们使真正重要的顺序、安全和兼容性注释更难被发现。

治理规则：

- 删除只复述代码的注释。
- 保留并精炼解释“为什么”的注释，例如启动顺序、安全例外、框架限制和兼容性原因。
- `AI modified:` 只用于行为、逻辑或结构变更，并说明原因；不为每行或简单字段映射添加。
- 按模块分批清理，避免一次性产生全仓库 diff。

### 2. 落实业务命名规则

**状态：Inspected**

明确示例：

- `normalizeWsExceptionError`（`src/examples/demo-websocket/demo-websocket-exception.filter.ts:97`）违反禁止使用 `normalize*` 的规则。
- `normalizedValue`（`config/validation.ts:28`）同样违反当前命名禁令。
- `parseFlag` / `parseUuid`（`src/examples/demo-database/demo-database.controller.ts:117-124`、service `:126-132`）只是返回 `{ enabled }` / `{ id }`，既不执行 parse，也形成了仅做字段映射的 service 方法。
- `toFileDto`、`toStateDto`、`createTimerJobDto` 等应逐一判断是否承载业务约束；仅复制字段的应内联，确有复用和规则的应按业务结果命名。

不要机械替换真正执行解析的 `parseBoolean`、`parseCsv`。规则应约束语义，而不是关键词本身。

### 3. 收紧泛化变量名

**状态：Inspected**

`data`、`result`、`item`、`value` 在多处承担具体业务含义。下一迭代应在触达模块时改为领域名称，例如 `cachedUser`、`healthStatus`、`uploadedFile`、`cookieValue`，但不要为了改名制造跨模块大 diff。

当前按声明扫描命中 68 个泛化名称，其中生产代码 52 个、测试 16 个。DTO/外部契约字段需要单独评审，不能按内部变量规则自动改名。

### 4. 统一 DTO 属性约定

**状态：Executed + Inspected**

83 个 DTO 文件共有 316 个属性：233 个 `readonly`、83 个可变；其中 20 个 DTO 文件全部使用可变属性。这与 strict property initialization 债务叠加，说明 DTO 声明方式尚未形成统一约定。

下一迭代应明确：

- 请求 DTO、响应 DTO 和内部状态 DTO 是否分别要求 `readonly`；
- class-transformer/class-validator 管理的属性使用何种严格初始化写法；
- Entity 不应机械套用 DTO 规则。

涉及公开请求/响应结构的字段改名属于公共 API 变更，需要确认。

### 5. 统一 import 规则

**状态：Executed + Inspected**

- 5 个文件存在从同一模块重复 import。
- 13 个文件存在 Node、NestJS、第三方或副作用 import 顺序不一致。
- `src/main.ts` 的 Sentry instrument 必须最先加载，属于需要明确记录的副作用例外。

建议固定为：`bootstrap side effect → node: → @nestjs → third-party → config alias/内部绝对路径 → relative`，再通过 lint 自动验证。

### 6. 统一 Global module 使用规则

**状态：Inspected**

当前 cache、http-client、queue、schedule 使用 `@Global()`，其他 common 模块显式导入。应记录一条可执行规则：

- 只有真正的进程级基础设施且被多数模块消费时才允许 global；
- 其余依赖显式导入；
- 模块是否 global 不由“common”目录名称决定。

### 7. 扩大只读格式检查范围

**状态：Executed + Inspected**

- 当前 `format` 只写入 `src/**/*.ts`、`test/**/*.ts`、`config/**/*.ts`。
- 没有 `format:check`。
- `prettier --check . --ignore-unknown` 当前发现 11 个不符合格式的文件，其中包括根配置、YAML、Markdown 和 lockfile。
- `eslint.config.mjs` 自己被 ESLint ignore，当前第 33 行还使用双引号和不同数组格式。

应先确定受管文件范围，再增加只读检查；不要直接格式化现有未跟踪文档或用户工作文件。

### 8. 对齐测试覆盖率与运行时版本契约

**状态：Inspected**

- Jest 配置了 coverage 输出，但没有 `coverageThreshold`，CI 也不运行 `test:cov`。
- 运行时、CI 和 Docker 使用 Node 24，但 `@types/node` 是 25.x；类型系统可能允许运行时不存在的 API。
- `package.json` 没有 `engines`，仓库也没有 `.node-version` / `.nvmrc`。

覆盖率阈值应从当前基线分模块渐进提升，不应先设一个无依据的全局数字。Node 类型版本应与实际运行时 major 对齐。

## 推荐实施顺序

### 阶段 0：建立基线

1. 修复 42 个测试类型错误和测试 fixture 类型。
2. 排除生成目录，增加 `typecheck`、`format:check`。
3. 冻结 DTO、import、布尔命名作用域和注释保留规则。
4. 收紧 ESLint 规则，并让 CI 执行全部只读检查。

### 阶段 1：处理确定性风险

1. 修复依赖 critical/high。
2. 修复 migration runtime glob 和部署迁移验证。
3. 增加日志脱敏。
4. 增加优雅关停验证，并使生产必需配置 fail fast。

### 阶段 2：确认安全契约

1. 统一 JWT HTTP/WebSocket 校验。
2. 确认 CSRF 与认证模型。
3. 统一 HTTP/WebSocket CORS。
4. 定义 health/readiness/限流契约。

认证、授权、CSRF 和公共接口行为变更必须先确认，再实施。

### 阶段 3：分模块机械整理

建议顺序：

1. `src/bootstrap` 与 `src/common`
2. 每个 `src/examples/demo-*`
3. `config`
4. `test`
5. 根配置和文档

每个批次只做注释、命名、import、mock 类型和局部重复清理；保持测试绿，不与安全行为修改混合。

## 下一迭代完成标准

- Helmet 和所有 Express 中间件只通过共享启动管线注册。
- lint、format check、全仓库 typecheck、unit、build、E2E 全部通过。
- TypeScript 当前配置下 0 错误；严格规则有分阶段清零计划。
- 生产依赖无未接受的 critical/high。
- 构建产物中的 migration 可被运行时发现。
- HTTP 与 WebSocket 的 JWT/CORS 契约一致或有明确文档化差异。
- CSRF 范围与认证模型一致。
- 注释主要解释原因，不再机械复述代码。
- 命名规则在 ESLint、review checklist 或可验证测试中得到落实。
