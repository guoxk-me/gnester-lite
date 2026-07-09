// CN: 控制器，定义 demo-security 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-security.
import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { DemoSecurityOverviewDto } from './dto/demo-security-overview.dto';
import { DemoSecurityService } from './demo-security.service';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-security',
})
export class DemoSecurityController {
  // CN: 初始化 demo-security 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-security.
  constructor(private readonly demoSecurityService: DemoSecurityService) {}

  // CN: 处理 demo-security 的 get security overview HTTP 请求；EN: Handles the get security overview HTTP request for demo-security.
  @Get()
  getSecurityOverview(): DemoSecurityOverviewDto {
    return this.demoSecurityService.getSecurityOverview();
  }
}
