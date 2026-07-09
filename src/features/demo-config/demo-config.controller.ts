// CN: 控制器，定义 demo-config 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-config.
import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { DemoConfigurationExampleDto } from './dto/demo-configuration-example.dto';
import { DemoConfigService } from './demo-config.service';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-config',
})
export class DemoConfigController {
  // CN: 初始化 demo-config 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-config.
  constructor(private readonly demoConfigService: DemoConfigService) {}

  // CN: 处理 demo-config 的 get configuration example HTTP 请求；EN: Handles the get configuration example HTTP request for demo-config.
  @Get()
  getConfigurationExample(): DemoConfigurationExampleDto {
    return this.demoConfigService.getConfigurationExample();
  }
}
