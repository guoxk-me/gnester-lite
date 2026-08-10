# gnester-lite Full Audit Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增一份可在 Cursor 中直接执行的 `gnester-lite` 一次性、只读、证据驱动的完整项目审计提示词。

**Architecture:** 使用一个主控提示词完成预检、能力矩阵、动态验证、六分区并行审计、交叉验证和报告生成。提示词支持无子任务能力时顺序降级，并通过项目特定事实避免 `VERSION_NEUTRAL`、模块装配和 test 环境分支误报。

**Tech Stack:** Markdown、Cursor Agent/Subagent、NestJS 11、TypeScript、pnpm、Jest、SWC、Docker Compose。

## Global Constraints

- 设计依据：`docs/superpowers/specs/2026-07-23-gnester-lite-full-audit-prompt-design.md`。
- 新提示词路径：`prompts/full-project-audit.md`。
- 保留 `prompts/self-audit-loop.md`，不得修改或替换。
- 审计当前工作区最终状态，不比较当前状态与 `HEAD`。
- 审计不修复代码；执行时唯一允许新增的项目文件是审计报告。
- 报告路径为 `docs/audits/YYYY-MM-DD-gnester-lite-full-audit.md`，同名时追加时间后缀。
- 不运行自动修复型 lint/format，不新增、删除或升级依赖，不启动容器服务，不操作数据库或迁移。
- 不提交或推送 Git。
- 输出使用简体中文，代码符号、命令和路径保持原文。

---

### Task 1: 编写一次性完整审计提示词

**Files:**

- Create: `prompts/full-project-audit.md`
- Reference: `docs/superpowers/specs/2026-07-23-gnester-lite-full-audit-prompt-design.md`
- Preserve: `prompts/self-audit-loop.md`

**Interfaces:**

- Consumes: 当前仓库文件、实际 `package.json` scripts、项目规则和只读命令结果。
- Produces: 一份独立 Markdown 主控提示词；执行后生成聊天摘要和完整审计报告。

- [ ] **Step 1: 写入用途和执行边界**

文件开头必须明确：

- 这是一次性全量审计，不是 loop，也不是修复任务。
- 审计对象是当前工作区最终状态。
- 除审计报告与被忽略的生成物外，不得修改现有项目文件。
- 单条命令失败不得提前终止审计。
- 所有结论使用 `Executed`、`Inspected`、`Assumed` 区分证据来源。

- [ ] **Step 2: 写入项目事实与误报防护**

必须包含：

- NestJS 11、Node.js 24、pnpm 11.1.2、SWC、Jest、MySQL 8、Redis 7。
- `common` 平台层、`features` 可移除 Demo 层及 `DemosModule` 聚合关系。
- common 能力既可能是 Nest Module，也可能是 bootstrap 配置函数。
- 路由按 `VERSION_NEUTRAL` 和全局 URI versioning 共同判断。
- auth/authorization/crypto 可由 feature 按需导入。
- test 环境 queue、Sentry、schedule 特殊分支先验证设计意图再判定。
- YAML 默认值和环境变量双层校验。
- 外部服务或网络不可用记为环境阻塞，不冒充代码缺陷。

- [ ] **Step 3: 写入主控流程和六个审计分区**

主控流程必须依次执行：

1. 预检与开始状态快照。
2. 全量 inventory 和能力矩阵。
3. 非修复型动态验证。
4. 六分区并行只读审计。
5. 汇总、去重和跨分区交叉验证。
6. 覆盖门槛检查。
7. 写报告和聊天摘要。
8. 结束状态检查。

六个分区必须分别覆盖：

1. 完成度、模块装配、架构和清晰度。
2. 正确性、边界、并发、资源释放和性能。
3. 认证授权、输入、网络、文件、秘密和供应链安全。
4. 单测、e2e、coverage、mock 和生产路径一致性。
5. README、专题文档、OpenAPI/AsyncAPI、配置和代码契约。
6. 配置、迁移、日志、Sentry、health、Docker、CI、生产启动和 DX。

每个分区必须返回已检查范围、正式发现、未验证项和关键无发现检查点。没有并行能力时按同样顺序执行。

- [ ] **Step 4: 写入十五维度检查清单**

清单必须逐项覆盖设计文档第 5 节，不得把“安全”“测试”或“文档”缩成宽泛的一句话。特别列出：

- Passport 与手写 JWT guard 并存的一致性。
- Redis 运行时依赖与 readiness 语义。
- 完整 AppModule e2e 与切片 e2e 的差异。
- Cache/Queue/Schedule/Events/Upload/SSE/WebSocket 的幂等、竞态和清理。
- 配置、类型、文档、Docker 和 CI 的多向一致性。
- README 从零启动是否真实包含 MySQL、Redis、env 和 migration 前置条件。

- [ ] **Step 5: 写入动态验证矩阵**

提示词先读取实际 scripts，再依次尝试：

```bash
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm run lint:check
pnpm run test
pnpm run test:cov
pnpm run build
pnpm run test:e2e
pnpm run compodoc
pnpm exec prettier --check "src/**/*.ts" "test/**/*.ts" "config/**/*.ts"
docker compose config --quiet
pnpm audit --prod
```

`pnpm install --frozen-lockfile` 只在依赖缺失或锁文件验证需要时运行。每条命令记录 `Pass`、`Fail`、`Blocked` 或 `Skipped`、退出码和简要证据。不得自动启动 MySQL、Redis 或 Compose 服务。

- [ ] **Step 6: 写入 finding、评分和报告契约**

正式 finding 必须包含唯一 ID、类别、`Blocker/High/Medium/Low/Info`、`Confirmed/Probable/Needs verification`、证据类型、路径与行号或命令、现象、影响、根因、验证方法、最小修复建议和建议测试。

评分必须使用设计文档的 0–5 rubric；存在未验证关键路径时对应维度最高为 3，Blocker 不得被平均分掩盖。

报告必须包含设计文档第 8 节的 12 个固定章节，并满足第 10 节全部完成门槛。

- [ ] **Step 7: 加入最终自查清单和调用示例**

提示词结束前要求主控确认：

- 全部目标目录和六个分区已覆盖。
- 能力矩阵无空状态。
- 命令矩阵无空状态。
- finding 已去重并有证据。
- 已区分代码缺陷、环境阻塞、设计权衡和改进建议。
- 未修改既有项目文件。
- 报告路径存在，聊天摘要引用该路径。

文件顶部给出直接调用示例：

```text
读取并严格执行 prompts/full-project-audit.md，对当前 gnester-lite 工作区进行一次性完整只读审计。
```

### Task 2: 验证提示词完整性和安全边界

**Files:**

- Inspect: `prompts/full-project-audit.md`
- Compare: `docs/superpowers/specs/2026-07-23-gnester-lite-full-audit-prompt-design.md`
- Verify unchanged: `prompts/self-audit-loop.md`

**Interfaces:**

- Consumes: Task 1 产出的完整提示词。
- Produces: 已通过内容一致性、范围和只读安全检查的最终提示词。

- [ ] **Step 1: 检查设计覆盖**

逐节对照设计文档，确认目标、已确认决策、项目事实、执行架构、十五维度、动态验证、发现模型、报告、评分、完成门槛和非目标均有对应提示词条款。

- [ ] **Step 2: 检查不可执行或危险指令**

确认提示词不要求：

- 修改或修复源码。
- 运行 `pnpm run lint`、`pnpm run format` 等写入命令。
- 启动容器、数据库或迁移。
- 安装新依赖。
- commit、push、force 或破坏性 Git 操作。
- 因测试失败停止剩余审计。

- [ ] **Step 3: 检查内部一致性**

确认：

- 审计分区是 6 个，评分维度是 15 个，报告固定章节是 12 个。
- `VERSION_NEUTRAL` 不会被机械判为缺陷。
- 当前工作区审计与“不得比较 HEAD”没有冲突。
- `pnpm install --frozen-lockfile` 仅安装锁文件中的现有依赖。
- 报告同名时不会覆盖。

- [ ] **Step 4: 检查文本质量**

检查是否存在无意的占位文字、矛盾规则、重复章节、模糊的“适当处理”或缺少判定标准的要求。保留日期模板 `YYYY-MM-DD` 作为运行时变量，不将其视为未完成内容。

- [ ] **Step 5: 检查文件差异**

确认本任务只新增：

- `prompts/full-project-audit.md`
- 本设计文档
- 本实施计划

不得修改当前已有 `prompts/self-audit-loop.md` 或其他项目文件，不创建提交。
