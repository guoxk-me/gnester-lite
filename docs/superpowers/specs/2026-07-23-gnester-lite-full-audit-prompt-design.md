# gnester-lite 一次性完整审计提示词设计

## 1. 目标

为 `gnester-lite` 编写一份可直接在 Cursor 中执行的一次性完整审计提示词。
审计只分析当前工作区最终状态，不比较 `HEAD`，不修复代码；唯一允许新增的项目文件是审计报告。

审计需要：

- 尽可能执行 lint、测试、覆盖率、构建、e2e、文档、Docker 配置和依赖安全验证。
- 系统覆盖完成度、正确性、安全、测试、文档、结构、清晰度、可靠性、运维和 DX。
- 产出聊天摘要和仓库内完整 Markdown 报告。
- 用可定位证据支撑每项结论，并明确未验证项。

## 2. 已确认决策

- 执行模式：一次性、只读、只报告，不自动修复。
- 审计基线：当前工作区最终状态，不分析未提交改动相对 `HEAD` 的差异。
- 验证深度：尽可能执行全部相关命令；环境不满足时记录为阻塞，不伪装成代码缺陷。
- 交付方式：聊天摘要 + `docs/audits/YYYY-MM-DD-gnester-lite-full-audit.md`。
- 执行架构：主控 Agent 编排并行只读审计；无并行能力时按同一分区顺序执行。

## 3. 项目事实

提示词必须基于以下事实判断，避免机械误报：

- 技术栈是 NestJS 11、TypeScript、Node.js 24、pnpm 11.1.2、SWC、Jest。
- MySQL 8 和 Redis 7 是运行时依赖，但现有 CI/e2e 不启动完整外部服务栈。
- `src/platform/` 是平台能力层，`src/features/` 是正式生产业务目录，`src/examples/` 是可整体移除的 Demo 目录。
- Demo 由 `DemosModule` 聚合；部分 platform 模块由 example 按需导入。
- cors、openapi、asyncapi、security、validation 和 websocket 等能力可以通过 bootstrap 配置函数接入，不要求都有 Nest Module。
- Demo controller 和 health 可能使用 `VERSION_NEUTRAL`；路由是否带 `/v1` 必须以装饰器和启动配置共同判断。
- test 环境会排除 queue demo、延迟 BullMQ 连接、跳过 Sentry 初始化并禁用计划任务；这些设计不能自动判为缺陷。
- 配置采用 YAML 默认值和环境变量双层校验。
- 启动链路以 `src/instrument.ts`、`src/main.ts` 和 `src/bootstrap/configure-application.ts` 为准。

## 4. 执行架构

### 4.1 主控阶段

1. 确认仓库根目录并读取 `AGENTS.md`、`CLAUDE.md`、README、`package.json` 和关键配置。
2. 记录运行环境、审计限制和开始时的工作区状态，不输出秘密值，也不把既有未提交改动当作审计对象。
3. 建立全量文件清单和能力矩阵。
4. 运行动态验证，任何单项失败都不得提前终止审计。
5. 编排六个只读审计分区。
6. 汇总、去重、交叉验证、检查遗漏并生成报告。
7. 对比开始与结束状态，只允许新增本次报告及被忽略的生成物。

### 4.2 六个审计分区

1. 完成度、模块装配、架构边界和代码清晰度。
2. 功能正确性、边界条件、并发、资源释放和性能。
3. 认证授权、输入、网络、文件、秘密和供应链安全。
4. 单元测试、e2e、覆盖率、mock 边界和生产路径一致性。
5. README、专题文档、OpenAPI/AsyncAPI、配置和代码契约一致性。
6. 配置、数据库迁移、日志、Sentry、health、Docker、CI、生产启动和开发者体验。

每个分区只能读文件和执行非修复型检查，必须返回已检查范围、证据化发现、未验证项和无发现的关键检查点。

### 4.3 顺序降级

如果执行环境不支持并行任务，主控按上述六个分区顺序执行。降级只影响速度，不降低覆盖要求。

## 5. 审计维度

提示词需要完整覆盖：

1. 模板能力完成度和 `common ↔ demo ↔ docs ↔ unit test ↔ e2e ↔ config` 对称性。
2. 功能正确性、边界值、错误状态、Promise 异常和资源清理。
3. JWT、Passport、手写 guard、角色、权限和策略的一致性。
4. CSRF、CORS、Cookie、Session、Helmet、限流和代理信任边界。
5. DTO 校验、注入、SSRF、路径穿越、上传限制、日志敏感信息和秘密泄露。
6. Nest DI、imports/providers/exports、`@Global()`、依赖方向和循环依赖。
7. TypeScript 严格度、显式类型、命名、注释、职责、重复和死代码。
8. YAML/env/config types 三向一致性及生产安全默认值。
9. TypeORM 实体、`Relation<T>`、迁移、事务、查询、分页和部署迁移路径。
10. Cache、Queue、Schedule、Events、HTTP、Upload、SSE 和 WebSocket 的幂等、竞态、超时、重试与清理。
11. 测试覆盖数量和质量、失败路径、假阳性、外部依赖隔离和完整应用装配。
12. 路由/versioning、DTO、状态码、OpenAPI/AsyncAPI 和文档示例契约。
13. 日志、Sentry 隔离、liveness/readiness、优雅停机和生产诊断能力。
14. Docker、CI、生产构建、启动路径、依赖漏洞、锁文件和仓库卫生。
15. 新贡献者能否按 README 从零完成安装、启动、测试、构建和迁移。

## 6. 动态验证

提示词应先读取实际 scripts，再运行适用命令。预期至少包括：

- Node.js 与 pnpm 版本检查。
- 锁文件一致性检查；只有依赖缺失时才允许 `pnpm install --frozen-lockfile`。
- `pnpm run lint:check`。
- `pnpm run test`。
- `pnpm run test:cov`。
- `pnpm run build`。
- `pnpm run test:e2e`。
- `pnpm run compodoc`。
- Prettier 只读检查。
- `docker compose config`。
- `pnpm audit --prod`。

不得运行带自动修复的 lint/format 命令，不得自动启动或修改 MySQL、Redis、容器、数据库或迁移。
Docker daemon、网络或外部服务不可用时，相关项目记为 `Blocked` 或 `Skipped` 并说明影响。

## 7. 发现模型

### 7.1 严重度

- `Blocker`：无法构建、启动或完成核心用途，或存在直接高危安全问题。
- `High`：重要功能错误、安全边界失效、数据风险或发布阻断。
- `Medium`：可复现的非核心缺陷、重要测试/文档/可靠性缺口。
- `Low`：局部可维护性、清晰度、一致性或低影响 DX 问题。
- `Info`：非缺陷改进项或已接受的设计权衡。

### 7.2 置信度

- `Confirmed`：由执行结果或直接代码路径确认。
- `Probable`：证据较强，但缺少完整运行环境验证。
- `Needs verification`：合理风险，需要额外环境或人工决策。

### 7.3 证据类型

- `Executed`：来自实际命令或运行时结果。
- `Inspected`：来自代码、配置、测试或文档检查。
- `Assumed`：仅用于限制说明，不得作为确认缺陷的唯一依据。

每条正式 finding 必须包含：

- 唯一 ID、类别、严重度、置信度和证据类型。
- 文件路径、行号或命令。
- 现象、影响、根因。
- 复现或进一步验证方法。
- 最小修复建议和建议补充的测试。

重复发现必须合并。外部环境失败、潜在风险、确认缺陷和文档建议必须分开。

## 8. 报告设计

完整报告路径：

`docs/audits/YYYY-MM-DD-gnester-lite-full-audit.md`

其中日期取执行当天；若目标文件已存在，追加时间后缀，禁止覆盖已有报告。

固定章节：

1. 审计元数据、范围和限制。
2. 执行摘要及按严重度统计。
3. 环境与验证命令矩阵。
4. 十五维度评分卡及证据化评分理由。
5. 全量能力矩阵。
6. 详细 findings。
7. 测试与覆盖率缺口。
8. 代码、配置、API 和文档不一致项。
9. 架构、安全、可靠性和运维横切风险。
10. 环境阻塞、未验证项和剩余盲区。
11. 只提供建议、不实施的分阶段修复路线图。
12. 文件盘点与命令结果附录。

聊天摘要仅包含总体结论、最高风险、验证结果、未验证限制和报告路径。

## 9. 评分规则

每个维度按 0–5 评分并给出证据：

- `5`：覆盖充分，无实质问题，仅有信息项。
- `4`：存在 Low，但无 Medium 及以上。
- `3`：存在 Medium，或关键路径因环境未验证。
- `2`：存在 High，或多个重要路径未验证。
- `1`：存在 Blocker，或该维度大面积缺失。
- `0`：无法获取足够证据进行有效审计。

总体分不得简单平均掩盖高风险；存在 Blocker 时必须优先展示。

## 10. 完成门槛

仅当以下条件全部满足，主控才能宣布审计完成：

- 已盘点 `src/common`、`src/features`、`src/bootstrap`、`config`、`test`、`docs`、根配置、CI 和 Docker。
- 能力矩阵每行均标记为完整、部分、缺失或不适用。
- 六个审计分区全部完成，并列出实际检查范围。
- 所有预定动态验证都有 `Pass`、`Fail`、`Blocked` 或 `Skipped` 状态。
- 所有正式 finding 均有可定位证据并已去重。
- 未验证关键路径已明确降低对应评分与置信度。
- 已检查项目特定误报规则。
- 除新审计报告和被忽略的生成物外，未修改现有项目文件。

## 11. 非目标

- 不修复任何发现。
- 不提交或推送 Git。
- 不比较当前工作区与 `HEAD`。
- 不新增、删除或升级审计工具及项目依赖；允许按现有锁文件安装已声明依赖。
- 不启动容器服务、不操作数据库、不运行迁移。
- 不因单条命令失败而停止完整审计。
