import { Controller, Get, Header, Sse, VERSION_NEUTRAL } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { ApiResponse, type ApiResponseOptions } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { DemoSseScenarioDto } from './dto/demo-sse-scenario.dto';
import { DemoSseService } from './demo-sse.service';

// AI modified: keep the declared SSE cache contract identical to Nest's final wire response.
const sseCacheControl =
  'private, no-cache, no-store, must-revalidate, max-age=0, no-transform';

// AI modified: Observable<MessageEvent> is serialized as an SSE text stream, not JSON.
const demoSseStreamResponse: ApiResponseOptions = {
  status: 200,
  description:
    'Finite or bounded server-sent event stream; EventSource clients may reconnect after completion',
  content: {
    'text/event-stream': {
      schema: {
        type: 'string',
        example:
          'id: demo-1\nevent: notification\nretry: 5000\ndata: {"message":"example"}\n\n',
      },
    },
  },
  headers: {
    'Cache-Control': {
      description: 'Prevents caching or response transformation of the stream',
      schema: {
        type: 'string',
        example: sseCacheControl,
      },
    },
    'X-Accel-Buffering': {
      description: 'Disables buffering in compatible reverse proxies',
      schema: { type: 'string', example: 'no' },
    },
  },
};

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-sse',
})
export class DemoSseController {
  constructor(private readonly demoSseService: DemoSseService) {}

  @Get()
  listScenarios(): DemoSseScenarioDto[] {
    return this.demoSseService.listScenarios();
  }

  @Sse('notifications')
  @Header('Cache-Control', sseCacheControl)
  @Header('X-Accel-Buffering', 'no')
  @ApiResponse(demoSseStreamResponse)
  streamNotifications(): Observable<MessageEvent> {
    return this.demoSseService.streamNotifications();
  }

  @Sse('job-progress')
  @Header('Cache-Control', sseCacheControl)
  @Header('X-Accel-Buffering', 'no')
  @ApiResponse(demoSseStreamResponse)
  streamJobProgress(): Observable<MessageEvent> {
    return this.demoSseService.streamJobProgress();
  }

  @Sse('activity-feed')
  @Header('Cache-Control', sseCacheControl)
  @Header('X-Accel-Buffering', 'no')
  @ApiResponse(demoSseStreamResponse)
  streamActivityFeed(): Observable<MessageEvent> {
    return this.demoSseService.streamActivityFeed();
  }

  @Sse('metrics')
  @Header('Cache-Control', sseCacheControl)
  @Header('X-Accel-Buffering', 'no')
  @ApiResponse(demoSseStreamResponse)
  streamMetrics(): Observable<MessageEvent> {
    return this.demoSseService.streamMetrics();
  }

  @Sse('heartbeat')
  @Header('Cache-Control', sseCacheControl)
  @Header('X-Accel-Buffering', 'no')
  @ApiResponse(demoSseStreamResponse)
  streamHeartbeat(): Observable<MessageEvent> {
    return this.demoSseService.streamHeartbeat();
  }
}
