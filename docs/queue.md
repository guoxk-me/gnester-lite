# Queue

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

`CommonQueueModule` owns the BullMQ root registration and shared queue defaults.
`NODE_ENV=test` uses manual registration, while `DemosModule` skips the demo
queue feature so app-level tests do not start workers or require Redis.
Ordinary producers and every `FlowProducer` parent/child node also receive the
configured retry and `removeOnComplete` / `removeOnFail` values explicitly.
Flow nodes do not inherit a separately registered queue's defaults, so this
keeps completed and failed workflow jobs within the same retention budgets.

## Common Module

`CommonQueueModule` exports BullMQ and `CommonQueueService`, which centralizes
template queue behavior:

- rejects job mutation when `queue.enabled` is false
- adds jobs with typed payloads
- returns operational counts
- pauses and resumes queues
- serializes distributed producer admission and rejects new work before the
  pending backlog can exceed its configured demo boundary

## Demo Module

`DemoQueueModule` registers the `demo` queue and exposes:

- `POST /demo-queue/email`
- `POST /demo-queue/long-task`
- `POST /demo-queue/subtasks`
- `GET /demo-queue/status`
- `POST /demo-queue/pause`
- `POST /demo-queue/resume`

`POST /demo-queue/email` creates a fast job:

All queue mutations require the README CSRF cookie-jar/token flow when
`CSRF_ENABLED=true`.

```json
{
  "to": "test@example.com",
  "subject": "Queue demo test",
  "body": "Hello from the queue"
}
```

Email addresses are limited to 254 characters. Subjects must contain
non-whitespace text and are limited to 120 characters; optional bodies are
limited to 2,000 characters.

`POST /demo-queue/long-task` creates a simulated long-running job that updates
progress across multiple steps:

```json
{
  "taskName": "monthly-report",
  "durationMs": 10000,
  "steps": 5
}
```

`POST /demo-queue/subtasks` creates a BullMQ flow. Child jobs run first, and the
parent workflow job completes after all children complete:

```json
{
  "workflowName": "onboarding",
  "subtasks": [
    {
      "name": "send-welcome-email",
      "durationMs": 2000
    },
    {
      "name": "create-trial-workspace",
      "durationMs": 3000
    }
  ]
}
```

Long-task names, workflow names, and subtask names must contain non-whitespace
text and are limited to 80 characters. A workflow accepts 1–10 subtasks.

The demo queue admits at most 100 pending nodes across waiting, active, delayed,
prioritized, paused, and waiting-children states. A workflow reserves one slot
for its parent and one for each child. Producers use a short Redis lock around
the authoritative pending count and enqueue/flow publication, so concurrent
instances cannot all pass the same capacity check. The lock is token-protected,
expires after five seconds, and is released on both success and failure.
Capacity exhaustion or lock contention returns `503` before a job is
published.

`DemoQueueProcessor` owns a dedicated BullMQ `Worker` connection and dispatches
typed job names in one `switch`. Producers use bounded retry/command timeouts;
workers use the blocking-connection retry policy BullMQ requires.

A producer's ioredis `commandTimeout` rejects the individual command promise
but does not remove that command from ioredis's FIFO reply queue. The matching
`socketTimeout` is therefore retained to destroy and reconnect a socket while a
pending command receives no data. ioredis arms this socket timer only after
writing a command and stops it once no command is pending, so a truly idle
producer connection is not recycled every three seconds.

A producer timeout is an availability boundary, not proof that Redis rejected
the command. The API therefore reports that the mutation outcome may be
unknown. Production workflows that retry queue mutations must provide a stable
BullMQ `jobId` (or an equivalent idempotency key) and reconcile the existing
job before retrying. This demo does not claim exactly-once delivery.

## Verify

```bash
pnpm run test -- src/platform/infrastructure/queue/ src/examples/demo-queue/
pnpm run test:full-app
```

`test:full-app` is destructive and requires the disposable infrastructure
opt-in and loopback-only environment documented in the README.
