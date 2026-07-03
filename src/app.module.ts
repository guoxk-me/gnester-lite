import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import KeyvRedis from '@keyv/redis';
import configuration from 'config/configuration';
import { databaseConfig } from 'config/database.config';
import { validate } from 'config/validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonCacheModule } from './common/cache/cache.module';
import { CommonHttpClientModule } from './common/http-client/http-client.module';
import { CommonQueueModule } from './common/queue/queue.module';
import { DemoCacheModule } from './features/demo-cache/demo-cache.module';
import { DemoConfigModule } from './features/demo-config/demo-config.module';
import { DemoCookiesModule } from './features/demo-cookies/demo-cookies.module';
import { DemoDatabaseModule } from './features/demo-database/demo-database.module';
import { DemoEventsModule } from './features/demo-events/demo-events.module';
import { DemoHttpModule } from './features/demo-http/demo-http.module';
import { DemoQueueModule } from './features/demo-queue/demo-queue.module';
import { DemoSerializationModule } from './features/demo-serialization/demo-serialization.module';
import { DemoSessionModule } from './features/demo-session/demo-session.module';
import { DemoStreamingFilesModule } from './features/demo-streaming-files/demo-streaming-files.module';

const isTestEnvironment = process.env.NODE_ENV === 'test';
const queueFeatureImports = isTestEnvironment ? [] : [DemoQueueModule];

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
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ttl: configService.getOrThrow<number>('cache.ttl'),
        stores: [new KeyvRedis(configService.getOrThrow<string>('REDIS_URL'))],
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      extraOptions: {
        manualRegistration: isTestEnvironment,
      },
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.getOrThrow<string>('REDIS_URL'),
          lazyConnect: isTestEnvironment,
          enableOfflineQueue: !isTestEnvironment,
          maxRetriesPerRequest: isTestEnvironment ? 1 : null,
        },
        prefix: `${configService.getOrThrow<string>('queue.prefix')}:${configService.getOrThrow<string>('NODE_ENV')}`,
        defaultJobOptions: {
          attempts: configService.getOrThrow<number>('queue.defaultAttempts'),
          backoff: {
            type: 'exponential',
            delay: configService.getOrThrow<number>('queue.backoffDelay'),
          },
          removeOnComplete: configService.getOrThrow<number>(
            'queue.removeOnComplete',
          ),
          removeOnFail: configService.getOrThrow<number>('queue.removeOnFail'),
        },
      }),
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: process.env.NODE_ENV !== 'production',
      ignoreErrors: false,
    }),
    CommonCacheModule,
    CommonHttpClientModule,
    CommonQueueModule,
    DemoCacheModule,
    DemoConfigModule,
    DemoCookiesModule,
    DemoDatabaseModule,
    DemoEventsModule,
    DemoHttpModule,
    ...queueFeatureImports,
    DemoSerializationModule,
    DemoSessionModule,
    DemoStreamingFilesModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
