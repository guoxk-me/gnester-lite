import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ScheduleOverviewDto } from '../../common/schedule/dto/schedule-overview.dto';
import { DemoScheduleRunDto } from './dto/demo-schedule-run.dto';
import { DemoScheduleService } from './demo-schedule.service';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-schedule',
})
export class DemoScheduleController {
  constructor(private readonly demoScheduleService: DemoScheduleService) {}

  @Get('jobs')
  getOverview(): ScheduleOverviewDto {
    return this.demoScheduleService.getOverview();
  }

  @Post('jobs/declarative-cron/run')
  @HttpCode(HttpStatus.ACCEPTED)
  runDeclarativeCron(): DemoScheduleRunDto | undefined {
    return this.demoScheduleService.handleDeclarativeCron();
  }

  @Post('jobs/dynamic-cron/register')
  @HttpCode(HttpStatus.ACCEPTED)
  registerDynamicCronJob(): ScheduleOverviewDto {
    this.demoScheduleService.registerDynamicCronJob();
    return this.demoScheduleService.getOverview();
  }

  @Post('jobs/dynamic-cron/run')
  @HttpCode(HttpStatus.ACCEPTED)
  runDynamicCron(): DemoScheduleRunDto | undefined {
    return this.demoScheduleService.handleDynamicCron();
  }

  @Post('jobs/interval/run')
  @HttpCode(HttpStatus.ACCEPTED)
  runInterval(): DemoScheduleRunDto | undefined {
    return this.demoScheduleService.handleInterval();
  }

  @Post('jobs/timeout/run')
  @HttpCode(HttpStatus.ACCEPTED)
  runTimeout(): DemoScheduleRunDto | undefined {
    return this.demoScheduleService.handleTimeout();
  }
}
