import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import {
  SentryGlobalFilter,
  SentryModule as NestSentryModule,
} from '@sentry/nestjs/setup';

// AI modified: register SentryGlobalFilter first so unhandled HTTP errors reach Sentry.
@Module({
  imports: [NestSentryModule.forRoot()],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class SentryModule {}
