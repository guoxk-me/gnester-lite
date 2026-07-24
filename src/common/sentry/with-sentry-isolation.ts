// CN: 隔离后台任务的 Sentry 作用域；EN: Isolates Sentry scope for background jobs.
import * as Sentry from '@sentry/nestjs';

// AI modified: prevents cron/queue/event breadcrumbs from leaking into HTTP errors.
export function withSentryIsolation<T>(callback: () => T): T {
  return Sentry.withIsolationScope(callback);
}
