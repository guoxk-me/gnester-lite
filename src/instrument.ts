import * as Sentry from '@sentry/nestjs';

import {
  loadProjectEnvironmentFiles,
  sentryBootstrapEnvironment,
  shouldInitializeSentry,
} from './config/environment-files.js';
import { sentryPrivacyOptions } from './sentry/sentry-privacy.js';

// AI modified: instrumentation needs the same dotenv inputs before Nest creates ConfigModule.
loadProjectEnvironmentFiles();

const nodeEnv = process.env.NODE_ENV ?? 'development';
const sentryDsn = process.env.SENTRY_DSN?.trim();
const { isEnabled: isSentryEnabled, tracesSampleRate } =
  sentryBootstrapEnvironment(process.env);

// AI modified: skip init without DSN or in test so the template stays runnable offline.
if (shouldInitializeSentry(nodeEnv, sentryDsn, isSentryEnabled)) {
  Sentry.init({
    dsn: sentryDsn,
    environment: nodeEnv,
    tracesSampleRate,
    // AI modified: apply the shared deny-by-default request and trace privacy contract.
    ...sentryPrivacyOptions,
  });
}
