import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from 'config/configuration';
import { databaseConfig } from 'config/database.config';
import { validate } from 'config/validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonCacheModule } from './common/cache/cache.module';
import { CommonCsrfModule } from './common/csrf/csrf.module';
import { CommonHttpClientModule } from './common/http-client/http-client.module';
import { CommonHealthModule } from './common/health/health.module';
import { CommonLoggerModule } from './common/logger/logger.module';
import { CommonQueueModule } from './common/queue/queue.module';
import { CommonRateLimitModule } from './common/rate-limit/rate-limit.module';
import { CommonScheduleModule } from './common/schedule/schedule.module';
import { CommonSentryModule } from './common/sentry/sentry.module';
import { DemosModule } from './features/demos.module';

// AI modified: compose the platform and removable demo catalog at explicit module boundaries.
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      ignoreEnvFile: false,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      isGlobal: true,
      cache: true,
      validate,
    }),
    TypeOrmModule.forRootAsync(databaseConfig.asProvider()),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: process.env.NODE_ENV !== 'production',
      ignoreErrors: false,
    }),
    CommonSentryModule,
    CommonCacheModule,
    CommonCsrfModule,
    CommonHealthModule,
    CommonHttpClientModule,
    CommonLoggerModule,
    CommonQueueModule,
    CommonRateLimitModule,
    CommonScheduleModule,
    DemosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
