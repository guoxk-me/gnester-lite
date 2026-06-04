// CN: 服务，承载 schedule common 的业务逻辑；EN: Service holds business logic for schedule common.
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob, CronJobParams, CronTime } from 'cron';
import { ScheduleJobDto } from './dto/schedule-job.dto';
import { ScheduleOverviewDto } from './dto/schedule-overview.dto';

export interface AddCronJobOptions {
  readonly name: string;
  readonly cronTime: CronJobParams['cronTime'];
  readonly onTick: CronJobParams['onTick'];
  readonly start?: boolean;
  readonly timeZone?: string;
  readonly waitForCompletion?: boolean;
}

export interface AddTimerOptions {
  readonly name: string;
  readonly milliseconds: number;
  readonly onTick: () => void;
}

@Injectable()
export class CommonScheduleService implements OnApplicationShutdown {
  private readonly managedCronJobs = new Set<string>();
  private readonly managedIntervals = new Set<string>();
  private readonly managedTimeouts = new Set<string>();

  // CN: 初始化 schedule common 的依赖和运行状态；EN: Initializes dependencies and runtime state for schedule common.
  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  // CN: 执行 schedule common 的 on application shutdown 业务逻辑；EN: Runs the on application shutdown business logic for schedule common.
  async onApplicationShutdown(): Promise<void> {
    await Promise.all(
      [...this.managedCronJobs].map((name) => this.deleteCronJob(name)),
    );
    [...this.managedIntervals].forEach((name) => this.deleteInterval(name));
    [...this.managedTimeouts].forEach((name) => this.deleteTimeout(name));
  }

  // CN: 执行 schedule common 的 is enabled 业务逻辑；EN: Runs the is enabled business logic for schedule common.
  isEnabled(): boolean {
    return this.configService.getOrThrow<boolean>('schedule.enabled');
  }

  // CN: 执行 schedule common 的 get time zone 业务逻辑；EN: Runs the get time zone business logic for schedule common.
  getTimeZone(): string {
    return this.configService.getOrThrow<string>('schedule.timeZone');
  }

  // CN: 执行 schedule common 的 get overview 业务逻辑；EN: Runs the get overview business logic for schedule common.
  getOverview(): ScheduleOverviewDto {
    return {
      enabled: this.isEnabled(),
      timeZone: this.getTimeZone(),
      cronJobs: this.listCronJobs(),
      intervals: this.listIntervals(),
      timeouts: this.listTimeouts(),
    };
  }

  // CN: 执行 schedule common 的 list cron jobs 业务逻辑；EN: Runs the list cron jobs business logic for schedule common.
  listCronJobs(): ScheduleJobDto[] {
    return [...this.schedulerRegistry.getCronJobs().entries()]
      .map(([name, job]) => ({
        name,
        type: 'cron' as const,
        active: job.isActive,
        managed: this.managedCronJobs.has(name),
        lastRunAt: job.lastDate()?.toISOString() ?? null,
        nextRunAt: this.getNextRunAt(job),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  // CN: 执行 schedule common 的 list intervals 业务逻辑；EN: Runs the list intervals business logic for schedule common.
  listIntervals(): ScheduleJobDto[] {
    return this.schedulerRegistry
      .getIntervals()
      .map((name) => this.createTimerJobDto(name, 'interval'))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  // CN: 执行 schedule common 的 list timeouts 业务逻辑；EN: Runs the list timeouts business logic for schedule common.
  listTimeouts(): ScheduleJobDto[] {
    return this.schedulerRegistry
      .getTimeouts()
      .map((name) => this.createTimerJobDto(name, 'timeout'))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  // CN: 执行 schedule common 的 add cron job 业务逻辑；EN: Runs the add cron job business logic for schedule common.
  addCronJob(options: AddCronJobOptions): boolean {
    if (
      !this.isEnabled() ||
      this.schedulerRegistry.doesExist('cron', options.name)
    ) {
      return false;
    }

    const job = CronJob.from({
      cronTime: options.cronTime,
      onTick: options.onTick,
      start: false,
      timeZone: options.timeZone ?? this.getTimeZone(),
      waitForCompletion: options.waitForCompletion ?? true,
      name: options.name,
    });

    this.schedulerRegistry.addCronJob(options.name, job);
    this.managedCronJobs.add(options.name);

    if (options.start !== false) {
      job.start();
    }

    return true;
  }

  // CN: 执行 schedule common 的 start cron job 业务逻辑；EN: Runs the start cron job business logic for schedule common.
  startCronJob(name: string): boolean {
    if (!this.schedulerRegistry.doesExist('cron', name)) {
      return false;
    }

    this.schedulerRegistry.getCronJob(name).start();
    return true;
  }

  // CN: 执行 schedule common 的 stop cron job 业务逻辑；EN: Runs the stop cron job business logic for schedule common.
  async stopCronJob(name: string): Promise<boolean> {
    if (!this.schedulerRegistry.doesExist('cron', name)) {
      return false;
    }

    await this.schedulerRegistry.getCronJob(name).stop();
    return true;
  }

  // CN: 执行 schedule common 的 delete cron job 业务逻辑；EN: Runs the delete cron job business logic for schedule common.
  async deleteCronJob(name: string): Promise<boolean> {
    if (!this.schedulerRegistry.doesExist('cron', name)) {
      this.managedCronJobs.delete(name);
      return false;
    }

    await this.schedulerRegistry.getCronJob(name).stop();
    this.schedulerRegistry.deleteCronJob(name);
    this.managedCronJobs.delete(name);
    return true;
  }

  // CN: 执行 schedule common 的 reschedule cron job 业务逻辑；EN: Runs the reschedule cron job business logic for schedule common.
  rescheduleCronJob(
    name: string,
    cronTime: CronJobParams['cronTime'],
  ): boolean {
    if (!this.schedulerRegistry.doesExist('cron', name)) {
      return false;
    }

    this.schedulerRegistry
      .getCronJob(name)
      .setTime(new CronTime(cronTime, this.getTimeZone()));
    return true;
  }

  // CN: 执行 schedule common 的 add interval 业务逻辑；EN: Runs the add interval business logic for schedule common.
  addInterval(options: AddTimerOptions): boolean {
    if (
      !this.isEnabled() ||
      this.schedulerRegistry.doesExist('interval', options.name)
    ) {
      return false;
    }

    const intervalRef = setInterval(options.onTick, options.milliseconds);
    this.schedulerRegistry.addInterval(options.name, intervalRef);
    this.managedIntervals.add(options.name);
    return true;
  }

  // CN: 执行 schedule common 的 has interval 业务逻辑；EN: Runs the has interval business logic for schedule common.
  hasInterval(name: string): boolean {
    if (!this.schedulerRegistry.doesExist('interval', name)) {
      return false;
    }

    this.schedulerRegistry.getInterval(name);
    return true;
  }

  // CN: 执行 schedule common 的 delete interval 业务逻辑；EN: Runs the delete interval business logic for schedule common.
  deleteInterval(name: string): boolean {
    if (!this.schedulerRegistry.doesExist('interval', name)) {
      this.managedIntervals.delete(name);
      return false;
    }

    this.schedulerRegistry.getInterval(name);
    this.schedulerRegistry.deleteInterval(name);
    this.managedIntervals.delete(name);
    return true;
  }

  // CN: 执行 schedule common 的 add timeout 业务逻辑；EN: Runs the add timeout business logic for schedule common.
  addTimeout(options: AddTimerOptions): boolean {
    if (
      !this.isEnabled() ||
      this.schedulerRegistry.doesExist('timeout', options.name)
    ) {
      return false;
    }

    const timeoutRef = setTimeout(() => {
      try {
        options.onTick();
      } finally {
        this.managedTimeouts.delete(options.name);
        if (this.schedulerRegistry.doesExist('timeout', options.name)) {
          this.schedulerRegistry.deleteTimeout(options.name);
        }
      }
    }, options.milliseconds);
    this.schedulerRegistry.addTimeout(options.name, timeoutRef);
    this.managedTimeouts.add(options.name);
    return true;
  }

  // CN: 执行 schedule common 的 has timeout 业务逻辑；EN: Runs the has timeout business logic for schedule common.
  hasTimeout(name: string): boolean {
    if (!this.schedulerRegistry.doesExist('timeout', name)) {
      return false;
    }

    this.schedulerRegistry.getTimeout(name);
    return true;
  }

  // CN: 执行 schedule common 的 delete timeout 业务逻辑；EN: Runs the delete timeout business logic for schedule common.
  deleteTimeout(name: string): boolean {
    if (!this.schedulerRegistry.doesExist('timeout', name)) {
      this.managedTimeouts.delete(name);
      return false;
    }

    this.schedulerRegistry.getTimeout(name);
    this.schedulerRegistry.deleteTimeout(name);
    this.managedTimeouts.delete(name);
    return true;
  }

  // CN: 执行 schedule common 的 create timer job dto 业务逻辑；EN: Runs the create timer job dto business logic for schedule common.
  private createTimerJobDto(
    name: string,
    type: 'interval' | 'timeout',
  ): ScheduleJobDto {
    return {
      name,
      type,
      active: true,
      managed: false,
      lastRunAt: null,
      nextRunAt: null,
    };
  }

  // CN: 执行 schedule common 的 get next run at 业务逻辑；EN: Runs the get next run at business logic for schedule common.
  private getNextRunAt(job: CronJob): string | null {
    try {
      return job.nextDate().toJSDate().toISOString();
    } catch {
      return null;
    }
  }
}
