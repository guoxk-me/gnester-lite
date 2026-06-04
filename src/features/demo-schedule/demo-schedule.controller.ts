// CN: 控制器，定义 demo-schedule 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-schedule.
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ScheduleOverviewDto } from '../../common/schedule/dto/schedule-overview.dto';
import {
  DEMO_DYNAMIC_CRON_JOB,
  DEMO_DYNAMIC_INTERVAL_JOB,
  DEMO_DYNAMIC_TIMEOUT_JOB,
} from './demo-schedule.constants';
import {
  DemoScheduleAction,
  DemoScheduleActionDto,
} from './dto/demo-schedule-action.dto';
import { DemoScheduleRunDto } from './dto/demo-schedule-run.dto';
import { DemoScheduleService } from './demo-schedule.service';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-schedule',
})
export class DemoScheduleController {
  // CN: 初始化 demo-schedule 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-schedule.
  constructor(private readonly demoScheduleService: DemoScheduleService) {}

  // CN: 处理 demo-schedule 的 get overview HTTP 请求；EN: Handles the get overview HTTP request for demo-schedule.
  @Get('jobs')
  getOverview(): ScheduleOverviewDto {
    return this.demoScheduleService.getOverview();
  }

  // CN: 处理 demo-schedule 的 run declarative cron HTTP 请求；EN: Handles the run declarative cron HTTP request for demo-schedule.
  @Post('jobs/declarative-cron/run')
  @HttpCode(HttpStatus.ACCEPTED)
  runDeclarativeCron(): DemoScheduleRunDto | undefined {
    return this.demoScheduleService.handleDeclarativeCron();
  }

  // CN: 处理 demo-schedule 的 register dynamic cron job HTTP 请求；EN: Handles the register dynamic cron job HTTP request for demo-schedule.
  @Post('jobs/dynamic-cron/register')
  @HttpCode(HttpStatus.ACCEPTED)
  registerDynamicCronJob(): ScheduleOverviewDto {
    this.demoScheduleService.registerDynamicCronJob();
    return this.demoScheduleService.getOverview();
  }

  // CN: 处理 demo-schedule 的 start dynamic cron job HTTP 请求；EN: Handles the start dynamic cron job HTTP request for demo-schedule.
  @Post('jobs/dynamic-cron/start')
  @HttpCode(HttpStatus.ACCEPTED)
  startDynamicCronJob(): DemoScheduleActionDto {
    return this.createActionResult(
      DEMO_DYNAMIC_CRON_JOB,
      'cron',
      'start',
      this.demoScheduleService.startDynamicCronJob(),
    );
  }

  // CN: 处理 demo-schedule 的 stop dynamic cron job HTTP 请求；EN: Handles the stop dynamic cron job HTTP request for demo-schedule.
  @Post('jobs/dynamic-cron/stop')
  @HttpCode(HttpStatus.ACCEPTED)
  async stopDynamicCronJob(): Promise<DemoScheduleActionDto> {
    return this.createActionResult(
      DEMO_DYNAMIC_CRON_JOB,
      'cron',
      'stop',
      await this.demoScheduleService.stopDynamicCronJob(),
    );
  }

  // CN: 处理 demo-schedule 的 reschedule dynamic cron job HTTP 请求；EN: Handles the reschedule dynamic cron job HTTP request for demo-schedule.
  @Post('jobs/dynamic-cron/reschedule')
  @HttpCode(HttpStatus.ACCEPTED)
  rescheduleDynamicCronJob(): DemoScheduleActionDto {
    return this.createActionResult(
      DEMO_DYNAMIC_CRON_JOB,
      'cron',
      'reschedule',
      this.demoScheduleService.rescheduleDynamicCronJob(),
    );
  }

  // CN: 处理 demo-schedule 的 delete dynamic cron job HTTP 请求；EN: Handles the delete dynamic cron job HTTP request for demo-schedule.
  @Post('jobs/dynamic-cron/delete')
  @HttpCode(HttpStatus.ACCEPTED)
  async deleteDynamicCronJob(): Promise<DemoScheduleActionDto> {
    return this.createActionResult(
      DEMO_DYNAMIC_CRON_JOB,
      'cron',
      'delete',
      await this.demoScheduleService.deleteDynamicCronJob(),
    );
  }

  // CN: 处理 demo-schedule 的 run dynamic cron HTTP 请求；EN: Handles the run dynamic cron HTTP request for demo-schedule.
  @Post('jobs/dynamic-cron/run')
  @HttpCode(HttpStatus.ACCEPTED)
  runDynamicCron(): DemoScheduleRunDto | undefined {
    return this.demoScheduleService.handleDynamicCron();
  }

  // CN: 处理 demo-schedule 的 register dynamic interval HTTP 请求；EN: Handles the register dynamic interval HTTP request for demo-schedule.
  @Post('jobs/dynamic-interval/register')
  @HttpCode(HttpStatus.ACCEPTED)
  registerDynamicInterval(): DemoScheduleActionDto {
    return this.createActionResult(
      DEMO_DYNAMIC_INTERVAL_JOB,
      'interval',
      'register',
      this.demoScheduleService.registerDynamicInterval(),
    );
  }

  // CN: 处理 demo-schedule 的 delete dynamic interval HTTP 请求；EN: Handles the delete dynamic interval HTTP request for demo-schedule.
  @Post('jobs/dynamic-interval/delete')
  @HttpCode(HttpStatus.ACCEPTED)
  deleteDynamicInterval(): DemoScheduleActionDto {
    return this.createActionResult(
      DEMO_DYNAMIC_INTERVAL_JOB,
      'interval',
      'delete',
      this.demoScheduleService.deleteDynamicInterval(),
    );
  }

  // CN: 处理 demo-schedule 的 run interval HTTP 请求；EN: Handles the run interval HTTP request for demo-schedule.
  @Post('jobs/interval/run')
  @HttpCode(HttpStatus.ACCEPTED)
  runInterval(): DemoScheduleRunDto | undefined {
    return this.demoScheduleService.handleInterval();
  }

  // CN: 处理 demo-schedule 的 register dynamic timeout HTTP 请求；EN: Handles the register dynamic timeout HTTP request for demo-schedule.
  @Post('jobs/dynamic-timeout/register')
  @HttpCode(HttpStatus.ACCEPTED)
  registerDynamicTimeout(): DemoScheduleActionDto {
    return this.createActionResult(
      DEMO_DYNAMIC_TIMEOUT_JOB,
      'timeout',
      'register',
      this.demoScheduleService.registerDynamicTimeout(),
    );
  }

  // CN: 处理 demo-schedule 的 delete dynamic timeout HTTP 请求；EN: Handles the delete dynamic timeout HTTP request for demo-schedule.
  @Post('jobs/dynamic-timeout/delete')
  @HttpCode(HttpStatus.ACCEPTED)
  deleteDynamicTimeout(): DemoScheduleActionDto {
    return this.createActionResult(
      DEMO_DYNAMIC_TIMEOUT_JOB,
      'timeout',
      'delete',
      this.demoScheduleService.deleteDynamicTimeout(),
    );
  }

  // CN: 处理 demo-schedule 的 run timeout HTTP 请求；EN: Handles the run timeout HTTP request for demo-schedule.
  @Post('jobs/timeout/run')
  @HttpCode(HttpStatus.ACCEPTED)
  runTimeout(): DemoScheduleRunDto | undefined {
    return this.demoScheduleService.handleTimeout();
  }

  // CN: 处理 demo-schedule 的 create action result HTTP 请求；EN: Handles the create action result HTTP request for demo-schedule.
  private createActionResult(
    name: string,
    type: DemoScheduleActionDto['type'],
    action: DemoScheduleAction,
    applied: boolean,
  ): DemoScheduleActionDto {
    return {
      name,
      type,
      action,
      applied,
    };
  }
}
