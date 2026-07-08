// CN: 控制器，定义 demo-cors 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-cors.
import { Controller, Get, Res, Session, VERSION_NEUTRAL } from '@nestjs/common';
import type { Response } from 'express';

import {
  DemoCorsResourceDto,
  DemoCredentialedCorsResourceDto,
} from './dto/demo-cors-resource.dto';
import { DemoCorsScenarioDto } from './dto/demo-cors-scenario.dto';
import { DemoCorsService } from './demo-cors.service';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-cors',
})
export class DemoCorsController {
  // CN: 初始化 demo-cors 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-cors.
  constructor(private readonly demoCorsService: DemoCorsService) {}

  // CN: 处理 demo-cors 的 get scenarios HTTP 请求；EN: Handles the get scenarios HTTP request for demo-cors.
  @Get('scenarios')
  getScenarios(): DemoCorsScenarioDto[] {
    return this.demoCorsService.getScenarios();
  }

  // CN: 处理 demo-cors 的 get public resource HTTP 请求；EN: Handles the get public resource HTTP request for demo-cors.
  @Get('public-resource')
  getPublicResource(
    @Res({ passthrough: true }) response: Response,
  ): DemoCorsResourceDto {
    response.setHeader('X-Demo-Cors-Trace', 'demo-cors-public-resource');

    return this.demoCorsService.getPublicResource();
  }

  // CN: 处理 demo-cors 的 get credentialed resource HTTP 请求；EN: Handles the get credentialed resource HTTP request for demo-cors.
  @Get('credentialed-resource')
  getCredentialedResource(
    @Session() session: Record<string, unknown> | undefined,
  ): DemoCredentialedCorsResourceDto {
    return this.demoCorsService.getCredentialedResource(Boolean(session));
  }
}
