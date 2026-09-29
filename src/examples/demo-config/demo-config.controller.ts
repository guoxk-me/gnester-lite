import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { DemoConfigurationExampleDto } from './dto/demo-configuration-example.dto.js';
import { DemoConfigService } from './demo-config.service.js';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-config',
})
export class DemoConfigController {
  constructor(private readonly demoConfigService: DemoConfigService) {}

  @Get()
  getConfigurationExample(): DemoConfigurationExampleDto {
    return this.demoConfigService.getConfigurationExample();
  }
}
