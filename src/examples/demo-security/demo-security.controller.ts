import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { DemoSecurityOverviewDto } from './dto/demo-security-overview.dto.js';
import { DemoSecurityService } from './demo-security.service.js';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-security',
})
export class DemoSecurityController {
  constructor(private readonly demoSecurityService: DemoSecurityService) {}

  @Get()
  getSecurityOverview(): DemoSecurityOverviewDto {
    return this.demoSecurityService.getSecurityOverview();
  }
}
