import { Module } from '@nestjs/common';
import { DemoSentryController } from './demo-sentry.controller';
import { DemoSentryService } from './demo-sentry.service';

@Module({
  controllers: [DemoSentryController],
  providers: [DemoSentryService],
})
export class DemoSentryModule {}
