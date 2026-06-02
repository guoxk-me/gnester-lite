# Schedule Guide / 定时任务指南

This document is for AI agents and developers who need to add or change
scheduled jobs safely.

本文档面向需要安全新增或修改定时任务的 AI agent 和开发者。

## Mental Model / 模型

- `@nestjs/schedule` runs in the current Node.js process.
  定时任务运行在当前 Node.js 进程内。
- Every app instance runs its own scheduled jobs.
  多副本部署时，每个实例都会执行自己的定时任务。
- Use scheduled jobs to trigger work; use BullMQ for long or retryable work.
  定时任务适合触发任务；耗时、可重试任务交给 BullMQ。

## Configuration / 配置

Schedule defaults live in `config/config.yaml`:

定时任务默认配置在 `config/config.yaml`：

```yaml
schedule:
  enabled: false
  timeZone: Asia/Shanghai
```

- `enabled`: global switch for template scheduled work.
  模板定时任务总开关。
- `timeZone`: IANA time zone. Beijing time is `Asia/Shanghai`.
  IANA 时区；北京时间写 `Asia/Shanghai`。

Do not use `UTC+8` or `Beijing`; validation rejects non-IANA values.

不要使用 `UTC+8` 或 `Beijing`；配置校验会拒绝非 IANA 时区。

## Key Files / 关键文件

- `src/app.module.ts`: imports `ScheduleModule.forRoot()` and
  `CommonScheduleModule`.
- `config/config.yaml`: schedule defaults.
- `config/configuration.ts`: validates `schedule.enabled` and
  `schedule.timeZone`.
- `src/common/schedule/schedule.service.ts`: shared runtime helpers.
- `src/features/demo-schedule/*`: declarative and dynamic job examples.

## Current API / 当前接口

```text
GET /demo-schedule/jobs
POST /demo-schedule/jobs/declarative-cron/run
POST /demo-schedule/jobs/dynamic-cron/register
POST /demo-schedule/jobs/dynamic-cron/run
POST /demo-schedule/jobs/interval/run
POST /demo-schedule/jobs/timeout/run
```

`GET /demo-schedule/jobs` returns the schedule switch, time zone, cron jobs,
intervals, and timeouts. The `POST .../run` routes manually execute each demo
scheduler style so the controller layer shows declarative cron, dynamic cron,
interval, and timeout entrypoints. The dynamic registration route demonstrates
idempotent runtime cron registration and returns the refreshed overview.

`GET /demo-schedule/jobs` 返回定时任务开关、时区、cron、interval 和 timeout
状态。`POST .../run` 路由手动执行每一种 demo 调度方式，让 controller 层示例覆盖
声明式 cron、动态 cron、interval 和 timeout。动态注册路由用于演示运行时幂等注册
cron，并返回刷新后的状态。

## How To Add A Job / 如何新增任务

Prefer a named cron job:

优先使用命名 cron 任务：

```ts
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
  name: 'feature-name:job-name',
  timeZone: 'Asia/Shanghai',
  waitForCompletion: true,
  disabled: process.env.NODE_ENV === 'test',
})
handleJob(): void {
  if (!this.scheduleService.isEnabled()) {
    return;
  }

  // Trigger short work here, or enqueue BullMQ work.
}
```

Rules / 规则：

1. Put job names in a constants file.
   任务名称放到 constants 文件。
2. Check `schedule.enabled` before doing work.
   执行业务前检查 `schedule.enabled`。
3. Use `waitForCompletion: true` unless overlap is intentional.
   默认使用 `waitForCompletion: true`，除非明确允许重叠。
4. Disable auto-running jobs in tests.
   测试环境禁用自动运行。
5. For dynamic jobs, use `CommonScheduleService.addCronJob()`.
   动态任务使用 `CommonScheduleService.addCronJob()`。

## Verify / 验证

```bash
pnpm run test -- src/common/schedule src/features/demo-schedule
pnpm run test
pnpm run build
```
