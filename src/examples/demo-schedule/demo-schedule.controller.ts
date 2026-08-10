import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  DEMO_DYNAMIC_CRON_JOB,
  DEMO_DYNAMIC_INTERVAL_JOB,
  DEMO_DYNAMIC_TIMEOUT_JOB,
} from './demo-schedule.constants';
import { DemoScheduleActionDto } from './dto/demo-schedule-action.dto';
import { DemoScheduleOverviewDto } from './dto/demo-schedule-overview.dto';
import { DemoScheduleRunDto } from './dto/demo-schedule-run.dto';
import { DemoScheduleService } from './demo-schedule.service';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-schedule',
})
export class DemoScheduleController {
  constructor(private readonly demoScheduleService: DemoScheduleService) {}

  @Get('jobs')
  getOverview(): DemoScheduleOverviewDto {
    return this.demoScheduleService.getOverview();
  }

  @Post('jobs/declarative-cron/run')
  @HttpCode(HttpStatus.ACCEPTED)
  runDeclarativeCron(): DemoScheduleRunDto | undefined {
    return this.demoScheduleService.handleDeclarativeCron();
  }

  @Post('jobs/dynamic-cron/register')
  @HttpCode(HttpStatus.ACCEPTED)
  registerDynamicCronJob(): DemoScheduleOverviewDto {
    this.demoScheduleService.registerDynamicCronJob();
    return this.demoScheduleService.getOverview();
  }

  @Post('jobs/dynamic-cron/start')
  @HttpCode(HttpStatus.ACCEPTED)
  startDynamicCronJob(): DemoScheduleActionDto {
    const isApplied = this.demoScheduleService.startDynamicCronJob();

    // AI modified: construct one-off action responses at the endpoint that owns their semantics.
    return {
      name: DEMO_DYNAMIC_CRON_JOB,
      type: 'cron',
      action: 'start',
      applied: isApplied,
    };
  }

  @Post('jobs/dynamic-cron/stop')
  @HttpCode(HttpStatus.ACCEPTED)
  async stopDynamicCronJob(): Promise<DemoScheduleActionDto> {
    const isApplied = await this.demoScheduleService.stopDynamicCronJob();

    return {
      name: DEMO_DYNAMIC_CRON_JOB,
      type: 'cron',
      action: 'stop',
      applied: isApplied,
    };
  }

  @Post('jobs/dynamic-cron/reschedule')
  @HttpCode(HttpStatus.ACCEPTED)
  rescheduleDynamicCronJob(): DemoScheduleActionDto {
    const isApplied = this.demoScheduleService.rescheduleDynamicCronJob();

    return {
      name: DEMO_DYNAMIC_CRON_JOB,
      type: 'cron',
      action: 'reschedule',
      applied: isApplied,
    };
  }

  @Post('jobs/dynamic-cron/delete')
  @HttpCode(HttpStatus.ACCEPTED)
  async deleteDynamicCronJob(): Promise<DemoScheduleActionDto> {
    const isApplied = await this.demoScheduleService.deleteDynamicCronJob();

    return {
      name: DEMO_DYNAMIC_CRON_JOB,
      type: 'cron',
      action: 'delete',
      applied: isApplied,
    };
  }

  @Post('jobs/dynamic-cron/run')
  @HttpCode(HttpStatus.ACCEPTED)
  runDynamicCron(): DemoScheduleRunDto | undefined {
    return this.demoScheduleService.handleDynamicCron();
  }

  @Post('jobs/dynamic-interval/register')
  @HttpCode(HttpStatus.ACCEPTED)
  registerDynamicInterval(): DemoScheduleActionDto {
    const isApplied = this.demoScheduleService.registerDynamicInterval();

    return {
      name: DEMO_DYNAMIC_INTERVAL_JOB,
      type: 'interval',
      action: 'register',
      applied: isApplied,
    };
  }

  @Post('jobs/dynamic-interval/delete')
  @HttpCode(HttpStatus.ACCEPTED)
  deleteDynamicInterval(): DemoScheduleActionDto {
    const isApplied = this.demoScheduleService.deleteDynamicInterval();

    return {
      name: DEMO_DYNAMIC_INTERVAL_JOB,
      type: 'interval',
      action: 'delete',
      applied: isApplied,
    };
  }

  @Post('jobs/interval/run')
  @HttpCode(HttpStatus.ACCEPTED)
  runInterval(): DemoScheduleRunDto | undefined {
    return this.demoScheduleService.handleInterval();
  }

  @Post('jobs/dynamic-timeout/register')
  @HttpCode(HttpStatus.ACCEPTED)
  registerDynamicTimeout(): DemoScheduleActionDto {
    const isApplied = this.demoScheduleService.registerDynamicTimeout();

    return {
      name: DEMO_DYNAMIC_TIMEOUT_JOB,
      type: 'timeout',
      action: 'register',
      applied: isApplied,
    };
  }

  @Post('jobs/dynamic-timeout/delete')
  @HttpCode(HttpStatus.ACCEPTED)
  deleteDynamicTimeout(): DemoScheduleActionDto {
    const isApplied = this.demoScheduleService.deleteDynamicTimeout();

    return {
      name: DEMO_DYNAMIC_TIMEOUT_JOB,
      type: 'timeout',
      action: 'delete',
      applied: isApplied,
    };
  }

  @Post('jobs/timeout/run')
  @HttpCode(HttpStatus.ACCEPTED)
  runTimeout(): DemoScheduleRunDto | undefined {
    return this.demoScheduleService.handleTimeout();
  }
}
