# Schedule / 定时任务

`src/infra/schedule/` 拥有 `ScheduleModule.forRoot()` 和 `ScheduleService`，导出共享调度运行能力。任务的业务语义、查询和外部调用归所属业务模块。

Nest 调度运行在当前进程；每个应用副本都有自己的调度器。需要跨实例唯一执行、长耗时或可靠重试的工作应通过分布式协调或 BullMQ 执行。

## Shared runtime / 共享运行能力

`src/config/config.yaml` 提供 `schedule.enabled` 和 IANA `schedule.timeZone`。`ScheduleService` 的动态注册遵循开关，并支持 cron 的注册、启动、停止、重排和删除，以及 interval/timeout 的注册和删除。回调可以同步或异步；共享运行能力记录异常、防止 interval 重叠，并在关停时等待正在运行的回调。

直接使用 `@Cron()` 的消费者需自行声明启用条件、时区、名称和重叠政策；共享配置不会自动改写装饰器。

## Assistant model synchronization / 模型同步

`src/modules/assistant/assistant-model-sync.service.ts` 拥有每天 04:00 的模型目录刷新，调用个人配置服务。它保留原有调度表达式和服务器时区语义，与通用动态调度开关相互独立。单个 Key 刷新失败只记录安全标识，不输出 Key 内容，也不阻止后续刷新。

## Verification / 验证

```bash
pnpm run test -- src/infra/schedule src/modules/assistant
pnpm run build
```
