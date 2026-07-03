// CN: 控制器，定义 demo-sse 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-sse.
import { Controller, Get, Header, Sse, VERSION_NEUTRAL } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { DemoSseScenarioDto } from './dto/demo-sse-scenario.dto';
import { DemoSseService } from './demo-sse.service';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-sse',
})
export class DemoSseController {
  // CN: 初始化 demo-sse 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-sse.
  constructor(private readonly demoSseService: DemoSseService) {}

  // CN: 处理 demo-sse 的 list scenarios HTTP 请求；EN: Handles the list scenarios HTTP request for demo-sse.
  @Get()
  listScenarios(): DemoSseScenarioDto[] {
    return this.demoSseService.listScenarios();
  }

  // CN: 处理 demo-sse 的 stream notifications HTTP 请求；EN: Handles the stream notifications HTTP request for demo-sse.
  @Sse('notifications')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  streamNotifications(): Observable<MessageEvent> {
    return this.demoSseService.streamNotifications();
  }

  // CN: 处理 demo-sse 的 stream job progress HTTP 请求；EN: Handles the stream job progress HTTP request for demo-sse.
  @Sse('job-progress')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  streamJobProgress(): Observable<MessageEvent> {
    return this.demoSseService.streamJobProgress();
  }

  // CN: 处理 demo-sse 的 stream activity feed HTTP 请求；EN: Handles the stream activity feed HTTP request for demo-sse.
  @Sse('activity-feed')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  streamActivityFeed(): Observable<MessageEvent> {
    return this.demoSseService.streamActivityFeed();
  }

  // CN: 处理 demo-sse 的 stream metrics HTTP 请求；EN: Handles the stream metrics HTTP request for demo-sse.
  @Sse('metrics')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  streamMetrics(): Observable<MessageEvent> {
    return this.demoSseService.streamMetrics();
  }

  // CN: 处理 demo-sse 的 stream heartbeat HTTP 请求；EN: Handles the stream heartbeat HTTP request for demo-sse.
  @Sse('heartbeat')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  streamHeartbeat(): Observable<MessageEvent> {
    return this.demoSseService.streamHeartbeat();
  }
}
