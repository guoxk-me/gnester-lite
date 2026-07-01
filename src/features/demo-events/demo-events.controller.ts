// CN: 控制器，定义 demo-events 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-events.
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { DemoEventOverviewDto } from './dto/demo-event-overview.dto';
import { DemoEventResultDto } from './dto/demo-event-result.dto';
import { InvalidateDemoCacheDto } from './dto/invalidate-demo-cache.dto';
import { RegisterDemoUserDto } from './dto/register-demo-user.dto';
import { DemoEventsService } from './demo-events.service';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-events',
})
export class DemoEventsController {
  // CN: 初始化 demo-events 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-events.
  constructor(private readonly demoEventsService: DemoEventsService) {}

  // CN: 处理 demo-events 的 get overview HTTP 请求；EN: Handles the get overview HTTP request for demo-events.
  @Get()
  getOverview(): DemoEventOverviewDto {
    return this.demoEventsService.getOverview();
  }

  // CN: 处理 demo-events 的 register user HTTP 请求；EN: Handles the register user HTTP request for demo-events.
  @Post('users/register')
  @HttpCode(HttpStatus.ACCEPTED)
  registerUser(
    @Body() registerDemoUserDto: RegisterDemoUserDto,
  ): DemoEventResultDto {
    return this.demoEventsService.registerUser(registerDemoUserDto);
  }

  // CN: 处理 demo-events 的 invalidate cache HTTP 请求；EN: Handles the invalidate cache HTTP request for demo-events.
  @Post('cache/invalidate')
  @HttpCode(HttpStatus.ACCEPTED)
  invalidateCache(
    @Body() invalidateDemoCacheDto: InvalidateDemoCacheDto,
  ): DemoEventResultDto {
    return this.demoEventsService.invalidateCache(invalidateDemoCacheDto);
  }

  // CN: 处理 demo-events 的 clear records HTTP 请求；EN: Handles the clear records HTTP request for demo-events.
  @Delete('records')
  @HttpCode(HttpStatus.NO_CONTENT)
  clearRecords(): void {
    this.demoEventsService.clear();
  }
}
