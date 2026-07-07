// CN: 控制器，定义 demo-rate-limit 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-rate-limit.
import { Controller, Get, Post, VERSION_NEUTRAL } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { DemoRateLimitScenarioDto } from './dto/demo-rate-limit-scenario.dto';
import { DemoRateLimitOverviewDto } from './dto/demo-rate-limit-overview.dto';
import { DemoRateLimitService } from './demo-rate-limit.service';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-rate-limit',
})
export class DemoRateLimitController {
  // CN: 初始化 demo-rate-limit 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-rate-limit.
  constructor(private readonly demoRateLimitService: DemoRateLimitService) {}

  // CN: 处理 demo-rate-limit 的 get overview HTTP 请求；EN: Handles the get overview HTTP request for demo-rate-limit.
  @Get()
  getOverview(): DemoRateLimitOverviewDto {
    return this.demoRateLimitService.getOverview();
  }

  // CN: 处理 demo-rate-limit 的 get default scenario HTTP 请求；EN: Handles the get default scenario HTTP request for demo-rate-limit.
  @Get('default')
  getDefaultScenario(): DemoRateLimitScenarioDto {
    return this.demoRateLimitService.getDefaultScenario();
  }

  // CN: 处理 demo-rate-limit 的 get credential scenario HTTP 请求；EN: Handles the get credential scenario HTTP request for demo-rate-limit.
  @Throttle({ short: { limit: 1, ttl: 60000 } })
  @Post('login')
  getCredentialScenario(): DemoRateLimitScenarioDto {
    return this.demoRateLimitService.getCredentialScenario();
  }

  // CN: 处理 demo-rate-limit 的 get skipped scenario HTTP 请求；EN: Handles the get skipped scenario HTTP request for demo-rate-limit.
  @SkipThrottle({ short: true, medium: true, long: true })
  @Get('health')
  getSkippedScenario(): DemoRateLimitScenarioDto {
    return this.demoRateLimitService.getSkippedScenario();
  }
}
