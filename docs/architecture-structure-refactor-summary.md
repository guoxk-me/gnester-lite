# gnester-lite 目录结构重构思路总结

## 1. 为什么要重构

当前困惑的核心是**职责边界不清**：业务代码、平台能力代码、演示代码（demo）混在一起，导致后续新增业务时容易越写越乱。
目标是把代码按“平台能力 + 业务特性”分开，避免以后模块间强耦合。

---

## 2. 重构原则（先定规则，再搬代码）

1. **按职责分层，不按技术名词分散**
   - `platform` 承担应用通用能力（横向能力）
   - `features` 承担正式生产业务能力（纵向能力）
   - `examples` 承担可整体移除的教学与集成示例
   - `bootstrap` 承担启动流程和全局管道

2. **业务优先，非业务能力下沉**
   - JWT / CSRF / 上传 / Redis / 数据库连接 / 队列 / 缓存等都应是平台能力，不属于业务功能。

3. **demo 与生产代码严格隔离**
   - `demo-*` 统一放入 `examples`，不与正式业务 Feature 混放。
   - 删除整个 `examples` 目录不应影响平台实现或正式生产功能。

4. **统一命名**
   - 业务层目录统一用 `features`，避免 `featrue` 这类拼写错误。

---

## 3. 建议的最终目录结构

```txt
src/
  app.module.ts
  main.ts
  bootstrap/
  platform/
    security/
    infrastructure/
    runtime/
    operations/
    observability/
  features/
  examples/
  contracts/
  migrations/
config/
test/
```

---

## 4. 各目录职责（清晰分配）

### `bootstrap/`

- 仅负责应用生命周期的启动编排：`main.ts`、全局中间件、过滤器、校验、路由版本、文档、适配器等。

### `platform/`

- 放置整个系统都可能复用的“基础能力”（Platform Capability）：
  - **security**: 鉴权、授权、CSRF、加密、限流等
  - **infrastructure**: 数据库、Redis、HTTP 客户端、上传、队列/任务基础设施
  - **runtime**: 定时任务、运行时调度等
  - **operations**: 健康检查、就绪性、维护工具
  - **observability**: 日志、监控、链路追踪、告警相关

### `features/`

- 正式生产业务放这里，每个业务一个文件夹（例如 `identity`, `user`, `order`, `payment`）。
- 一个 feature 自己管理：
  - controller / service / dto / entity / repository / module / test / migration（业务相关）
- Feature 即使只在部分部署启用，只要它是受支持的生产行为，仍然属于 `features`。

### `examples/`

- 教学、演示和集成样例放这里，例如缓存、队列、WebSocket、上传等 Demo。
- Example 可以依赖 `platform` 和 `contracts`，但正式 Feature 与平台实现不能依赖 Example。
- `DemosModule` 作为统一目录边界，生产环境不得加载该模块。

### `contracts/`

- 纯 TypeScript、框架无关的稳定契约（可选）：
  - 共享枚举、类型、接口、错误码语义、跨层边界约束
- 如果当前只有极少量常量（如邮箱长度），可以先临时并入最相关能力目录，后续再回迁到 `contracts/`。

### `migrations/`

- 生产环境可追溯数据库迁移；不要和 demo 演示迁移混放。

### `config/`

- 默认配置 + 环境变量校验（非业务）。

---

## 5. 关于 `contracts/` 与 `common/`

- `contracts` 是**可选但推荐保留**，前提是你们有持续增长的共享契约。
- 当前若只是“邮箱长度约束”这类极少量内容，可先合并到平台对应能力目录：
  - `platform/security/validation`
  - 或者 `platform/common/validation`
- `common/` 不建议长期存在无明确边界；没有明确职责就会变成“垃圾桶目录”。

---

## 6. 这次重构的决策结论（与你的场景一致）

- 你的判断是对的：`platform + features` 是更适合业务交付的主干结构。
- `features` 是正式生产业务落地主层；`platform` 负责底层能力。
- `examples` 保存可有可无的 Demo，并从生产模块图中排除。
- 目录名统一为 `features`，不建议 `featrue`。

---

## 7. 落地清单（下一步执行）

1. 保留 `src/features`，仅用于正式生产业务
2. 将 demo 相关移动到 `src/examples/`
3. 平台能力分类迁移到 `src/platform/*`
4. `contracts` 保留最小集合：有持续复用才保留，不足则并入平台相关子目录
5. 清理 `common/`：无明确职责则删除或并入具体父目录
6. 更新 `AppModule` 的模块引入关系，保持 `bootstrap/features/examples -> platform -> contracts` 的依赖方向

---

## 8. 风险提示（避免踩坑）

- 避免 platform 反向依赖 `features`、`examples` 或 `bootstrap`
- 避免正式 Feature 依赖 `examples`
- 避免 `features` 间互相私下 import 对方内部实现
- 业务迁移时优先保证编译通过，再逐步收敛目录，不要一次性大重构
