import { Module } from '@nestjs/common';
import { DemoSentryController } from './demo-sentry.controller';
import { DemoSentryService } from './demo-sentry.service';

// CN: 演示 Sentry 错误捕获与状态查询；EN: Demonstrates Sentry error capture and status checks.
@Module({
  controllers: [DemoSentryController],
  providers: [DemoSentryService],
})
export class DemoSentryModule {}
