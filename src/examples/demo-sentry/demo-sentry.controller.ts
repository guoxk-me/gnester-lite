import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
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
  // AI modified: this deliberate failure endpoint never has a successful response.
  @ApiResponse({ status: 500, description: 'Deliberate Sentry debug failure' })
  getDebugSentry(): never {
    return this.demoSentryService.triggerDebugError();
  }
}
