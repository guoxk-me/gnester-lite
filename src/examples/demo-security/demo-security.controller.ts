import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { DemoSecurityOverviewDto } from './dto/demo-security-overview.dto';
import { DemoSecurityService } from './demo-security.service';

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
