import { Module } from '@nestjs/common';

import { DemoAuthorizationModule } from './demo-authorization/demo-authorization.module';
import { DemoAuthModule } from './demo-auth/demo-auth.module';
import { DemoCacheModule } from './demo-cache/demo-cache.module';
import { DemoConfigModule } from './demo-config/demo-config.module';
import { DemoCookiesModule } from './demo-cookies/demo-cookies.module';
import { DemoCorsModule } from './demo-cors/demo-cors.module';
import { DemoCryptoModule } from './demo-crypto/demo-crypto.module';
import { DemoCsrfModule } from './demo-csrf/demo-csrf.module';
import { DemoDatabaseModule } from './demo-database/demo-database.module';
import { DemoEventsModule } from './demo-events/demo-events.module';
import { DemoHttpModule } from './demo-http/demo-http.module';
import { DemoQueueModule } from './demo-queue/demo-queue.module';
import { DemoRateLimitModule } from './demo-rate-limit/demo-rate-limit.module';
import { DemoScheduleModule } from './demo-schedule/demo-schedule.module';
import { DemoSecurityModule } from './demo-security/demo-security.module';
import { DemoSentryModule } from './demo-sentry/demo-sentry.module';
import { DemoSerializationModule } from './demo-serialization/demo-serialization.module';
import { DemoSessionModule } from './demo-session/demo-session.module';
import { DemoSseModule } from './demo-sse/demo-sse.module';
import { DemoStreamingFilesModule } from './demo-streaming-files/demo-streaming-files.module';
import { DemoUploadModule } from './demo-upload/demo-upload.module';
import { DemoWebsocketModule } from './demo-websocket/demo-websocket.module';

const isTestEnvironment = process.env.NODE_ENV === 'test';
const queueFeatureImports = isTestEnvironment ? [] : [DemoQueueModule];

// AI modified: isolate the removable demo catalog from the application infrastructure composition.
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
    ...queueFeatureImports,
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
