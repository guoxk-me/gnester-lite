import { Controller, Get, Post, VERSION_NEUTRAL } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SkipHttpThrottle } from '../../common/http/skip-http-throttle.decorator.js';
import { DemoRateLimitScenarioDto } from './dto/demo-rate-limit-scenario.dto.js';
import { DemoRateLimitOverviewDto } from './dto/demo-rate-limit-overview.dto.js';
import { DemoRateLimitService } from './demo-rate-limit.service.js';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-rate-limit',
})
export class DemoRateLimitController {
  constructor(private readonly demoRateLimitService: DemoRateLimitService) {}

  @Get()
  getOverview(): DemoRateLimitOverviewDto {
    return this.demoRateLimitService.getOverview();
  }

  @Get('default')
  getDefaultScenario(): DemoRateLimitScenarioDto {
    return this.demoRateLimitService.getDefaultScenario();
  }

  @Throttle({ short: { limit: 1, ttl: 60000 } })
  @Post('login')
  getCredentialScenario(): DemoRateLimitScenarioDto {
    return this.demoRateLimitService.getCredentialScenario();
  }

  // AI modified: the demo remains correct when applications rename configured budgets.
  @SkipHttpThrottle()
  @Get('health')
  getSkippedScenario(): DemoRateLimitScenarioDto {
    return this.demoRateLimitService.getSkippedScenario();
  }
}
