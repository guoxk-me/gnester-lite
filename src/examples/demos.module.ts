import { Module } from '@nestjs/common';

import { DemoAuthorizationModule } from './demo-authorization/demo-authorization.module.js';
import { DemoAuthModule } from './demo-auth/demo-auth.module.js';
import { DemoCacheModule } from './demo-cache/demo-cache.module.js';
import { DemoConfigModule } from './demo-config/demo-config.module.js';
import { DemoCookiesModule } from './demo-cookies/demo-cookies.module.js';
import { DemoCorsModule } from './demo-cors/demo-cors.module.js';
import { DemoCryptoModule } from './demo-crypto/demo-crypto.module.js';
import { DemoCsrfModule } from './demo-csrf/demo-csrf.module.js';
import { DemoDatabaseModule } from './demo-database/demo-database.module.js';
import { DemoEventsModule } from './demo-events/demo-events.module.js';
import { DemoHttpModule } from './demo-http/demo-http.module.js';
import { DemoQueueModule } from './demo-queue/demo-queue.module.js';
import { DemoRateLimitModule } from './demo-rate-limit/demo-rate-limit.module.js';
import { DemoScheduleModule } from './demo-schedule/demo-schedule.module.js';
import { DemoSecurityModule } from './demo-security/demo-security.module.js';
import { DemoSentryModule } from './demo-sentry/demo-sentry.module.js';
import { DemoSerializationModule } from './demo-serialization/demo-serialization.module.js';
import { DemoSessionModule } from './demo-session/demo-session.module.js';
import { DemoSseModule } from './demo-sse/demo-sse.module.js';
import { DemoStreamingFilesModule } from './demo-streaming-files/demo-streaming-files.module.js';
import { DemoUploadModule } from './demo-upload/demo-upload.module.js';
import { DemoWebsocketModule } from './demo-websocket/demo-websocket.module.js';

const isTestEnvironment = process.env.NODE_ENV === 'test';
const queueExampleImports = isTestEnvironment ? [] : [DemoQueueModule];

// AI modified: isolate the removable example catalog from production features and platform composition.
@Module({
  imports: [
    DemoAuthorizationModule,
    DemoAuthModule,
    DemoCacheModule,
    DemoConfigModule,
    DemoCorsModule,
    DemoCookiesModule,
    DemoCsrfModule,
    DemoCryptoModule,
    DemoDatabaseModule,
    DemoEventsModule,
    DemoHttpModule,
    ...queueExampleImports,
    DemoRateLimitModule,
    DemoScheduleModule,
    DemoSecurityModule,
    DemoSentryModule,
    DemoSerializationModule,
    DemoSessionModule,
    DemoSseModule,
    DemoStreamingFilesModule,
    DemoUploadModule,
    DemoWebsocketModule,
  ],
})
export class DemosModule {}
