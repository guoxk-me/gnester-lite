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
  constructor(private readonly demoEventsService: DemoEventsService) {}

  @Get()
  getOverview(): DemoEventOverviewDto {
    return this.demoEventsService.getOverview();
  }

  @Post('users/register')
  @HttpCode(HttpStatus.ACCEPTED)
  registerUser(
    @Body() registerDemoUserDto: RegisterDemoUserDto,
  ): DemoEventResultDto {
    return this.demoEventsService.registerUser(registerDemoUserDto);
  }

  @Post('cache/invalidate')
  @HttpCode(HttpStatus.ACCEPTED)
  invalidateCache(
    @Body() invalidateDemoCacheDto: InvalidateDemoCacheDto,
  ): DemoEventResultDto {
    return this.demoEventsService.invalidateCache(invalidateDemoCacheDto);
  }

  @Delete('records')
  @HttpCode(HttpStatus.NO_CONTENT)
  clearRecords(): void {
    this.demoEventsService.clear();
  }
}
