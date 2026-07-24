// CN: 控制器，定义 health common 的 HTTP 接口；EN: Controller defines HTTP endpoints for health common.
import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

// AI modified: VERSION_NEUTRAL so probes stay at /health/* (not /v1/health/*) matching README.
@Controller({
  version: VERSION_NEUTRAL,
  path: 'health',
})
export class HealthController {
  // CN: 初始化 health common 的依赖和运行状态；EN: Initializes dependencies and runtime state for health common.
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly databaseHealthIndicator: TypeOrmHealthIndicator,
  ) {}

  // CN: 处理 health common 的 check liveness HTTP 请求；EN: Handles the check liveness HTTP request for health common.
  @Get('live')
  @HealthCheck()
  checkLiveness(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () =>
        Promise.resolve({
          app: {
            status: 'up',
          },
        }),
    ]);
  }

  // CN: 处理 health common 的 check readiness HTTP 请求；EN: Handles the check readiness HTTP request for health common.
  @Get('ready')
  @HealthCheck()
  checkReadiness(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () => this.databaseHealthIndicator.pingCheck('database'),
    ]);
  }
}
