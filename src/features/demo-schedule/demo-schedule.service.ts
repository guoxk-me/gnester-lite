// CN: 服务，承载 demo-schedule 的业务逻辑；EN: Service holds business logic for demo-schedule.
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression, Interval, Timeout } from '@nestjs/schedule';
import { CommonScheduleService } from '../../common/schedule/schedule.service';
import {
  DEMO_CRON_PATTERN_JOB,
  DEMO_DECLARATIVE_CRON_JOB,
  DEMO_DYNAMIC_CRON_JOB,
  DEMO_DYNAMIC_INTERVAL_JOB,
  DEMO_DYNAMIC_TIMEOUT_JOB,
  DEMO_INTERVAL_JOB,
  DEMO_ONE_TIME_CRON_JOB,
  DEMO_TIMEOUT_JOB,
  DEMO_TIME_ZONE_CRON_JOB,
  DEMO_UTC_OFFSET_CRON_JOB,
} from './demo-schedule.constants';
import { ScheduleOverviewDto } from '../../common/schedule/dto/schedule-overview.dto';
import { DemoScheduleRunDto } from './dto/demo-schedule-run.dto';

@Injectable()
export class DemoScheduleService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DemoScheduleService.name);

  // CN: 初始化 demo-schedule 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-schedule.
  constructor(private readonly scheduleService: CommonScheduleService) {}

  // CN: 执行 demo-schedule 的 on application bootstrap 业务逻辑；EN: Runs the on application bootstrap business logic for demo-schedule.
  onApplicationBootstrap(): void {
    this.registerDynamicCronJob();
  }

  // CN: 执行 demo-schedule 的 handle declarative cron 业务逻辑；EN: Runs the handle declarative cron business logic for demo-schedule.
  @Cron(CronExpression.EVERY_30_SECONDS, {
    name: DEMO_DECLARATIVE_CRON_JOB,
    waitForCompletion: true,
    disabled: process.env.NODE_ENV === 'test',
  })
  handleDeclarativeCron(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_DECLARATIVE_CRON_JOB);
  }

  // CN: 执行 demo-schedule 的 handle cron pattern 业务逻辑；EN: Runs the handle cron pattern business logic for demo-schedule.
  @Cron('45 * * * * *', {
    name: DEMO_CRON_PATTERN_JOB,
    waitForCompletion: true,
    disabled: process.env.NODE_ENV === 'test',
  })
  handleCronPattern(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_CRON_PATTERN_JOB);
  }

  // CN: 执行 demo-schedule 的 handle one time cron 业务逻辑；EN: Runs the handle one time cron business logic for demo-schedule.
  @Cron(new Date(Date.now() + 24 * 60 * 60 * 1_000), {
    name: DEMO_ONE_TIME_CRON_JOB,
    waitForCompletion: true,
    disabled: process.env.NODE_ENV === 'test',
  })
  handleOneTimeCron(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_ONE_TIME_CRON_JOB);
  }

  // CN: 执行 demo-schedule 的 handle time zone cron 业务逻辑；EN: Runs the handle time zone cron business logic for demo-schedule.
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: DEMO_TIME_ZONE_CRON_JOB,
    timeZone: 'Asia/Shanghai',
    waitForCompletion: true,
    disabled: process.env.NODE_ENV === 'test',
  })
  handleTimeZoneCron(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_TIME_ZONE_CRON_JOB);
  }

  // CN: 执行 demo-schedule 的 handle utc offset cron 业务逻辑；EN: Runs the handle utc offset cron business logic for demo-schedule.
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: DEMO_UTC_OFFSET_CRON_JOB,
    utcOffset: 480,
    waitForCompletion: true,
    disabled: process.env.NODE_ENV === 'test',
  })
  handleUtcOffsetCron(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_UTC_OFFSET_CRON_JOB);
  }

  // CN: 执行 demo-schedule 的 handle interval 业务逻辑；EN: Runs the handle interval business logic for demo-schedule.
  @Interval(DEMO_INTERVAL_JOB, 60_000)
  handleInterval(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_INTERVAL_JOB);
  }

  // CN: 执行 demo-schedule 的 handle timeout 业务逻辑；EN: Runs the handle timeout business logic for demo-schedule.
  @Timeout(DEMO_TIMEOUT_JOB, 5_000)
  handleTimeout(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_TIMEOUT_JOB);
  }

  // CN: 执行 demo-schedule 的 get overview 业务逻辑；EN: Runs the get overview business logic for demo-schedule.
  getOverview(): ScheduleOverviewDto {
    return this.scheduleService.getOverview();
  }

  // CN: 执行 demo-schedule 的 register dynamic cron job 业务逻辑；EN: Runs the register dynamic cron job business logic for demo-schedule.
  registerDynamicCronJob(): boolean {
    return this.scheduleService.addCronJob({
      name: DEMO_DYNAMIC_CRON_JOB,
      cronTime: CronExpression.EVERY_DAY_AT_MIDNIGHT,
      onTick: () => {
        this.handleDynamicCron();
      },
    });
  }

  // CN: 执行 demo-schedule 的 start dynamic cron job 业务逻辑；EN: Runs the start dynamic cron job business logic for demo-schedule.
  startDynamicCronJob(): boolean {
    return this.scheduleService.startCronJob(DEMO_DYNAMIC_CRON_JOB);
  }

  // CN: 执行 demo-schedule 的 stop dynamic cron job 业务逻辑；EN: Runs the stop dynamic cron job business logic for demo-schedule.
  async stopDynamicCronJob(): Promise<boolean> {
    return this.scheduleService.stopCronJob(DEMO_DYNAMIC_CRON_JOB);
  }

  // CN: 执行 demo-schedule 的 reschedule dynamic cron job 业务逻辑；EN: Runs the reschedule dynamic cron job business logic for demo-schedule.
  rescheduleDynamicCronJob(): boolean {
    return this.scheduleService.rescheduleCronJob(
      DEMO_DYNAMIC_CRON_JOB,
      '15 * * * * *',
    );
  }

  // CN: 执行 demo-schedule 的 delete dynamic cron job 业务逻辑；EN: Runs the delete dynamic cron job business logic for demo-schedule.
  async deleteDynamicCronJob(): Promise<boolean> {
    return this.scheduleService.deleteCronJob(DEMO_DYNAMIC_CRON_JOB);
  }

  // CN: 执行 demo-schedule 的 handle dynamic cron 业务逻辑；EN: Runs the handle dynamic cron business logic for demo-schedule.
  handleDynamicCron(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_DYNAMIC_CRON_JOB);
  }

  // CN: 执行 demo-schedule 的 register dynamic interval 业务逻辑；EN: Runs the register dynamic interval business logic for demo-schedule.
  registerDynamicInterval(): boolean {
    return this.scheduleService.addInterval({
      name: DEMO_DYNAMIC_INTERVAL_JOB,
      milliseconds: 60_000,
      onTick: () => {
        this.handleDynamicInterval();
      },
    });
  }

  // CN: 执行 demo-schedule 的 delete dynamic interval 业务逻辑；EN: Runs the delete dynamic interval business logic for demo-schedule.
  deleteDynamicInterval(): boolean {
    return this.scheduleService.deleteInterval(DEMO_DYNAMIC_INTERVAL_JOB);
  }

  // CN: 执行 demo-schedule 的 handle dynamic interval 业务逻辑；EN: Runs the handle dynamic interval business logic for demo-schedule.
  handleDynamicInterval(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_DYNAMIC_INTERVAL_JOB);
  }

  // CN: 执行 demo-schedule 的 register dynamic timeout 业务逻辑；EN: Runs the register dynamic timeout business logic for demo-schedule.
  registerDynamicTimeout(): boolean {
    return this.scheduleService.addTimeout({
      name: DEMO_DYNAMIC_TIMEOUT_JOB,
      milliseconds: 5_000,
      onTick: () => {
        this.handleDynamicTimeout();
      },
    });
  }

  // CN: 执行 demo-schedule 的 delete dynamic timeout 业务逻辑；EN: Runs the delete dynamic timeout business logic for demo-schedule.
  deleteDynamicTimeout(): boolean {
    return this.scheduleService.deleteTimeout(DEMO_DYNAMIC_TIMEOUT_JOB);
  }

  // CN: 执行 demo-schedule 的 handle dynamic timeout 业务逻辑；EN: Runs the handle dynamic timeout business logic for demo-schedule.
  handleDynamicTimeout(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_DYNAMIC_TIMEOUT_JOB);
  }

  // CN: 执行 demo-schedule 的 run demo task 业务逻辑；EN: Runs the run demo task business logic for demo-schedule.
  private runDemoTask(task: string): DemoScheduleRunDto | undefined {
    if (!this.scheduleService.isEnabled()) {
      return undefined;
    }

    const result = {
      task,
      ranAt: new Date().toISOString(),
    };

    this.logger.log(`Scheduled task executed: ${task}`);
    return result;
  }
}
