import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression, Interval, Timeout } from '@nestjs/schedule';
import { CommonScheduleService } from '../../platform/runtime/schedule/schedule.service';
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
import { withSentryIsolation } from '../../platform/observability/sentry/with-sentry-isolation';
import { DemoScheduleOverviewDto } from './dto/demo-schedule-overview.dto';
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

  @Cron('45 * * * * *', {
    name: DEMO_CRON_PATTERN_JOB,
    waitForCompletion: true,
    disabled: process.env.NODE_ENV === 'test',
  })
  handleCronPattern(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_CRON_PATTERN_JOB);
  }

  @Cron(new Date(Date.now() + 24 * 60 * 60 * 1_000), {
    name: DEMO_ONE_TIME_CRON_JOB,
    waitForCompletion: true,
    disabled: process.env.NODE_ENV === 'test',
  })
  handleOneTimeCron(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_ONE_TIME_CRON_JOB);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: DEMO_TIME_ZONE_CRON_JOB,
    timeZone: 'Asia/Shanghai',
    waitForCompletion: true,
    disabled: process.env.NODE_ENV === 'test',
  })
  handleTimeZoneCron(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_TIME_ZONE_CRON_JOB);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: DEMO_UTC_OFFSET_CRON_JOB,
    utcOffset: 480,
    waitForCompletion: true,
    disabled: process.env.NODE_ENV === 'test',
  })
  handleUtcOffsetCron(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_UTC_OFFSET_CRON_JOB);
  }

  @Interval(DEMO_INTERVAL_JOB, 60_000)
  handleInterval(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_INTERVAL_JOB);
  }

  @Timeout(DEMO_TIMEOUT_JOB, 5_000)
  handleTimeout(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_TIMEOUT_JOB);
  }

  getOverview(): DemoScheduleOverviewDto {
    return this.scheduleService.getOverview();
  }

  registerDynamicCronJob(): boolean {
    return this.scheduleService.addCronJob({
      name: DEMO_DYNAMIC_CRON_JOB,
      cronTime: CronExpression.EVERY_DAY_AT_MIDNIGHT,
      onTick: () => {
        this.handleDynamicCron();
      },
    });
  }

  startDynamicCronJob(): boolean {
    return this.scheduleService.startCronJob(DEMO_DYNAMIC_CRON_JOB);
  }

  async stopDynamicCronJob(): Promise<boolean> {
    return this.scheduleService.stopCronJob(DEMO_DYNAMIC_CRON_JOB);
  }

  rescheduleDynamicCronJob(): boolean {
    return this.scheduleService.rescheduleCronJob(
      DEMO_DYNAMIC_CRON_JOB,
      '15 * * * * *',
    );
  }

  async deleteDynamicCronJob(): Promise<boolean> {
    return this.scheduleService.deleteCronJob(DEMO_DYNAMIC_CRON_JOB);
  }

  handleDynamicCron(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_DYNAMIC_CRON_JOB);
  }

  registerDynamicInterval(): boolean {
    return this.scheduleService.addInterval({
      name: DEMO_DYNAMIC_INTERVAL_JOB,
      milliseconds: 60_000,
      onTick: () => {
        this.handleDynamicInterval();
      },
    });
  }

  deleteDynamicInterval(): boolean {
    return this.scheduleService.deleteInterval(DEMO_DYNAMIC_INTERVAL_JOB);
  }

  handleDynamicInterval(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_DYNAMIC_INTERVAL_JOB);
  }

  registerDynamicTimeout(): boolean {
    return this.scheduleService.addTimeout({
      name: DEMO_DYNAMIC_TIMEOUT_JOB,
      milliseconds: 5_000,
      onTick: () => {
        this.handleDynamicTimeout();
      },
    });
  }

  deleteDynamicTimeout(): boolean {
    return this.scheduleService.deleteTimeout(DEMO_DYNAMIC_TIMEOUT_JOB);
  }

  handleDynamicTimeout(): DemoScheduleRunDto | undefined {
    return this.runDemoTask(DEMO_DYNAMIC_TIMEOUT_JOB);
  }

  private runDemoTask(task: string): DemoScheduleRunDto | undefined {
    // AI modified: isolate scheduled work so breadcrumbs do not leak into HTTP errors.
    return withSentryIsolation(() => {
      if (!this.scheduleService.isEnabled()) {
        return undefined;
      }

      const result = {
        task,
        ranAt: new Date().toISOString(),
      };

      this.logger.log(`Scheduled task executed: ${task}`);
      return result;
    });
  }
}
