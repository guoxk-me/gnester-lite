import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';

// CN: 接入 Sentry 模块与全局异常过滤器；EN: Wires Sentry module and global exception filter.
// AI modified: register SentryGlobalFilter first so unhandled HTTP errors reach Sentry.
@Module({
  imports: [SentryModule.forRoot()],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class CommonSentryModule {}
