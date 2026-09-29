import { Module } from '@nestjs/common';
import { DemoSentryController } from './demo-sentry.controller.js';
import { DemoSentryService } from './demo-sentry.service.js';

@Module({
  controllers: [DemoSentryController],
  providers: [DemoSentryService],
})
export class DemoSentryModule {}
