import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { DemoEventsController } from './demo-events.controller.js';
import { DemoEventsListener } from './demo-events.listener.js';
import { DemoEventsLogService } from './demo-events-log.service.js';
import { DemoEventsService } from './demo-events.service.js';

@Module({
  // AI modified: the event bus follows the only example that currently consumes it.
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: process.env.NODE_ENV !== 'production',
      ignoreErrors: false,
    }),
  ],
  controllers: [DemoEventsController],
  providers: [DemoEventsService, DemoEventsListener, DemoEventsLogService],
})
export class DemoEventsModule {}
