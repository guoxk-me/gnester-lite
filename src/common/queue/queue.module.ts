import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { CommonQueueService } from './queue.service';

const isTestEnvironment = process.env.NODE_ENV === 'test';

// AI modified: keep BullMQ root configuration beside the shared queue operations it supports.
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
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
  ],
  providers: [CommonQueueService],
  exports: [BullModule, CommonQueueService],
})
export class CommonQueueModule {}
