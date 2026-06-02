import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob, CronJobParams } from 'cron';
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

@Injectable()
export class CommonScheduleService implements OnApplicationShutdown {
  private readonly managedCronJobs = new Set<string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await Promise.all(
      [...this.managedCronJobs].map((name) => this.deleteCronJob(name)),
    );
  }

  isEnabled(): boolean {
    return this.configService.getOrThrow<boolean>('schedule.enabled');
  }

  getTimeZone(): string {
    return this.configService.getOrThrow<string>('schedule.timeZone');
  }

  getOverview(): ScheduleOverviewDto {
    return {
      enabled: this.isEnabled(),
      timeZone: this.getTimeZone(),
      cronJobs: this.listCronJobs(),
      intervals: this.listIntervals(),
      timeouts: this.listTimeouts(),
    };
  }

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

  listIntervals(): ScheduleJobDto[] {
    return this.schedulerRegistry
      .getIntervals()
      .map((name) => this.createTimerJobDto(name, 'interval'))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  listTimeouts(): ScheduleJobDto[] {
    return this.schedulerRegistry
      .getTimeouts()
      .map((name) => this.createTimerJobDto(name, 'timeout'))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

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

  startCronJob(name: string): boolean {
    if (!this.schedulerRegistry.doesExist('cron', name)) {
      return false;
    }

    this.schedulerRegistry.getCronJob(name).start();
    return true;
  }

  async stopCronJob(name: string): Promise<boolean> {
    if (!this.schedulerRegistry.doesExist('cron', name)) {
      return false;
    }

    await this.schedulerRegistry.getCronJob(name).stop();
    return true;
  }

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

  private getNextRunAt(job: CronJob): string | null {
    try {
      return job.nextDate().toJSDate().toISOString();
    } catch {
      return null;
    }
  }
}
