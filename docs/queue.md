# Queue / 队列

`src/infra/queue/` 提供 Redis-backed BullMQ 运行能力。`QueueModule` 拥有根注册、连接与默认参数，导出 BullMQ 和 `QueueService`。业务模块显式导入它并注册自己的队列、任务载荷和处理器。

## Configuration / 配置

`REDIS_URL` 提供连接，`src/config/config.yaml` 的 `queue` 配置提供启用开关、命名空间、重试、backoff 和完成/失败保留数量。命名空间包含环境，避免不同环境复用同一队列。`NODE_ENV=test` 手动注册 BullMQ，普通测试不会连接真实 Redis 或运行 worker。

`QueueService` 提供启用检查、有界操作、typed enqueue、计数、暂停/恢复及可选的 pending capacity 准入。准入使用 token 保护的短 Redis 锁，将计数与发布串行化，避免多实例同时越过容量限制。业务调用方决定容量，不在基础设施中硬编码业务政策。

生产者连接保留 bounded retry、command timeout 和 socket timeout；长生命周期 worker 使用单独连接和 BullMQ 所需的 blocking connection 策略。操作超时只说明后端未及时确认，发布结果可能未知。重试发布需要稳定 jobId 并核对现有任务，不能假设 exactly-once。

## Assistant / 助手消费者

`src/modules/assistant/assistant-generation.service.ts` 拥有回答任务入队与持久状态更新；`assistant.processor.ts` 执行任务并逐段保存内容；`assistant-provider.service.ts` 适配供应商协议。HTTP 读取持久化回答，前端继续轮询。worker 当前与 API 运行在同一进程。

个人 Key 仍由配置服务按账号检查、解密和选择；队列载荷不携带原始 Key。取消和重启恢复保留原有状态语义。

## Verification / 验证

```bash
pnpm run test -- src/infra/queue src/modules/assistant
pnpm run test:integration-policy
```

真实 MySQL/Redis 的 `test:full-app` 只对安全包装脚本允许的可丢弃基础设施执行。
