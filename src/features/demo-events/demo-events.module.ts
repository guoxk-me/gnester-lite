import { Module } from '@nestjs/common';
import { DemoEventsController } from './demo-events.controller';
import { DemoEventsListener } from './demo-events.listener';
import { DemoEventsLogService } from './demo-events-log.service';
import { DemoEventsService } from './demo-events.service';

// CN: 演示事件发布、监听和日志；EN: Demonstrates event publishing, listeners, and logs.
@Module({
  controllers: [DemoEventsController],
  providers: [DemoEventsService, DemoEventsListener, DemoEventsLogService],
})
export class DemoEventsModule {}
