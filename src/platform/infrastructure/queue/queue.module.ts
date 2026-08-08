import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { getQueueProducerConnectionOptions } from './queue-connection';
import { CommonQueueService } from './queue.service';

const isTestEnvironment = process.env.NODE_ENV === 'test';

// AI modified: keep BullMQ root configuration beside the shared queue operations it supports.
// AI modified: queue registration follows the feature that owns its producers and workers.
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      extraOptions: {
        manualRegistration: isTestEnvironment,
      },
      useFactory: (configService: ConfigService) => ({
        // AI modified: HTTP producers use a bounded policy; long-lived workers create a separate connection.
        connection: getQueueProducerConnectionOptions(
          configService.getOrThrow<string>('REDIS_URL'),
          isTestEnvironment,
        ),
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
