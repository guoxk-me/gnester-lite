import * as Sentry from '@sentry/nestjs';

import type {
  SentryCloseResult,
  SentryShutdownTarget,
} from './shutdown.types.js';

export async function closeSentryTelemetry(
  timeoutMs: number,
  sentry: SentryShutdownTarget = Sentry,
): Promise<SentryCloseResult> {
  if (!sentry.isInitialized()) {
    return 'not-initialized';
  }

  // AI modified: close flushes pending events and releases SDK resources before the process exits.
  return (await sentry.close(timeoutMs)) ? 'closed' : 'timed-out';
}
