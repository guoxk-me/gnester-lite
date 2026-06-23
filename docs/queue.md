# Queue

> CN: 文档文件，说明 queue 的用途；EN: Documentation file explains the purpose of queue.

This template uses `@nestjs/bullmq` and BullMQ for Redis-backed background jobs.
BullMQ is the default choice because the older Bull integration is in
maintenance mode.

## Configuration

Redis is configured through `REDIS_URL`. Queue defaults live in
`config/config.yaml`:

```yaml
queue:
  enabled: true
  prefix: gnester-lite
  defaultAttempts: 3
  backoffDelay: 1000
  removeOnComplete: 1000
  removeOnFail: 5000
```

`NODE_ENV=test` uses BullMQ manual registration and skips the demo queue feature
from `AppModule`, so app-level tests do not start workers or require Redis.

## Common Module

`CommonQueueModule` exports `CommonQueueService`, which centralizes template
queue behavior:

- rejects job mutation when `queue.enabled` is false
- adds jobs with typed payloads
- returns normalized operational counts
- pauses and resumes queues

## Demo Module

`DemoQueueModule` registers the `demo` queue and exposes:

- `POST /demo-queue/email`
- `GET /demo-queue/status`
- `POST /demo-queue/pause`
- `POST /demo-queue/resume`

BullMQ processors handle job names inside `WorkerHost.process()` with a
`switch` statement. Method-level `@Process('name')` handlers belong to the old
Bull integration and are not used for BullMQ.
