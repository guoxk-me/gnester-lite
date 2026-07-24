// CN: 控制器，定义 demo-sentry 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-sentry.
import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { DemoSentryScenarioDto } from './dto/demo-sentry-scenario.dto';
import { DemoSentryStatusDto } from './dto/demo-sentry-status.dto';
import { DemoSentryService } from './demo-sentry.service';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-sentry',
})
export class DemoSentryController {
  constructor(private readonly demoSentryService: DemoSentryService) {}

  @Get('scenarios')
  getScenarios(): DemoSentryScenarioDto[] {
    return this.demoSentryService.getScenarios();
  }

  @Get('status')
  getStatus(): DemoSentryStatusDto {
    return this.demoSentryService.getStatus();
  }

  @Get('debug-sentry')
  getDebugSentry(): never {
    return this.demoSentryService.triggerDebugError();
  }
}
