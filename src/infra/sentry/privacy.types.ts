import type * as Sentry from '@sentry/nestjs';

export type SentryOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;

export type SentrySpanPayload = Parameters<
  NonNullable<SentryOptions['beforeSendSpan']>
>[0];
