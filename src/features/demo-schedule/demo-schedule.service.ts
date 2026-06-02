import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression, Interval, Timeout } from '@nestjs/schedule';
import { CommonScheduleService } from '../../common/schedule/schedule.service';
import {
  DEMO_DECLARATIVE_CRON_JOB,
  DEMO_DYNAMIC_CRON_JOB,
  DEMO_INTERVAL_JOB,
  DEMO_TIMEOUT_JOB,
} from './demo-schedule.constants';
import { ScheduleOverviewDto } from '../../common/schedule/dto/schedule-overview.dto';
import { DemoScheduleRunDto } from './dto/demo-schedule-run.dto';

@Injectable()
export class DemoScheduleService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DemoScheduleService.name);

  constructor(private readonly scheduleService: CommonScheduleService) {}

  onApplicationBootstrap(): void {
    this.registerDynamicCronJob();
  }

  @Cron(CronExpression.EVERY_30_SECONDS, {
    name: DEMO_DECLARATIVE_CRON_JOB,
    waitForCompletion: true,
    disabled: process.env.NODE_ENV === 'test',
  })
  handleDeclarativeCron(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_DECLARATIVE_CRON_JOB);
  }

  @Interval(DEMO_INTERVAL_JOB, 60_000)
  handleInterval(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_INTERVAL_JOB);
  }

  @Timeout(DEMO_TIMEOUT_JOB, 5_000)
  handleTimeout(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_TIMEOUT_JOB);
  }

  getOverview(): ScheduleOverviewDto {
    return this.scheduleService.getOverview();
  }

  registerDynamicCronJob(): void {
    this.scheduleService.addCronJob({
      name: DEMO_DYNAMIC_CRON_JOB,
      cronTime: CronExpression.EVERY_DAY_AT_MIDNIGHT,
      onTick: () => {
        this.handleDynamicCron();
      },
    });
  }

  handleDynamicCron(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_DYNAMIC_CRON_JOB);
  }

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
