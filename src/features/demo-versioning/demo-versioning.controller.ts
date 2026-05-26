import { Controller, Get, VERSION_NEUTRAL, Version } from '@nestjs/common';
import {
  DemoVersioningNeutralDto,
  DemoVersioningSharedDto,
  DemoVersioningV1Dto,
  DemoVersioningV2Dto,
} from './dto/demo-versioning-response.dto';
import { DemoVersioningService } from './demo-versioning.service';

@Controller({
  path: 'demo-versioning',
  version: '1',
})
export class DemoVersioningController {
  constructor(private readonly demoVersioningService: DemoVersioningService) {}

  @Get()
  getV1(): DemoVersioningV1Dto {
    return this.demoVersioningService.findV1();
  }

  @Version('2')
  @Get()
  getV2(): DemoVersioningV2Dto {
    return this.demoVersioningService.findV2();
  }

  @Version(['1', '2'])
  @Get('shared')
  getShared(): DemoVersioningSharedDto {
    return this.demoVersioningService.findShared();
  }

  @Version(VERSION_NEUTRAL)
  @Get('neutral')
  getNeutral(): DemoVersioningNeutralDto {
    return this.demoVersioningService.findNeutral();
  }
}
