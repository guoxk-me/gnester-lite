import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { DemoConfigService } from './demo-config.service';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-config',
})
export class DemoConfigController {
  constructor(private readonly demoConfigService: DemoConfigService) {}

  @Get()
  getConfigurationExample(): { readonly appName: string } {
    return this.demoConfigService.getConfigurationExample();
  }
}
