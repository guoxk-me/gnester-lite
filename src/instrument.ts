// CN: Sentry 必须在其它模块之前初始化；EN: Sentry must initialize before other modules.
import * as Sentry from '@sentry/nestjs';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const sentryDsn = process.env.SENTRY_DSN?.trim();
const isSentryEnabled = process.env.SENTRY_ENABLED !== 'false';
const configuredSampleRate = process.env.SENTRY_TRACES_SAMPLE_RATE;
const tracesSampleRate =
  configuredSampleRate === undefined || configuredSampleRate === ''
    ? nodeEnv === 'production'
      ? 0.1
      : 1
    : Number(configuredSampleRate);

// AI modified: skip init without DSN or in test so the template stays runnable offline.
if (sentryDsn && isSentryEnabled && nodeEnv !== 'test') {
  Sentry.init({
    dsn: sentryDsn,
    environment: nodeEnv,
    tracesSampleRate,
    sendDefaultPii: false,
  });
}
