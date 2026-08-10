import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob, CronJobParams, CronTime } from 'cron';
import { captureBackgroundException } from '../../observability/sentry/with-sentry-isolation';
import type { ScheduleJobSnapshot, ScheduleOverview } from './schedule.types';

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
  readonly onTick: () => void | Promise<void>;
}

@Injectable()
export class CommonScheduleService implements OnApplicationShutdown {
  private readonly logger = new Logger(CommonScheduleService.name);
  private readonly managedCronJobs = new Set<string>();
  private readonly managedIntervals = new Set<string>();
  private readonly managedTimeouts = new Set<string>();
  private readonly runningTimerCallbacks = new Set<Promise<void>>();
  private readonly runningIntervals = new Set<string>();
  private isShuttingDown = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    // AI modified: prevent callbacks from registering new work while the scheduler drains.
    this.isShuttingDown = true;
    const cronDeletions = [...this.managedCronJobs].map((name) =>
      this.deleteCronJob(name),
    );
    // AI modified: stop future timer ticks before waiting for callbacks that are already running.
    [...this.managedIntervals].forEach((name) => this.deleteInterval(name));
    [...this.managedTimeouts].forEach((name) => this.deleteTimeout(name));
    const cronResults = await Promise.allSettled(cronDeletions);

    cronResults.forEach((cronResult) => {
      if (cronResult.status === 'rejected') {
        this.reportScheduleFailure(
          'Failed to stop a managed cron job during shutdown',
          cronResult.reason,
        );
      }
    });
    await Promise.allSettled([...this.runningTimerCallbacks]);
  }

  isEnabled(): boolean {
    return this.configService.getOrThrow<boolean>('schedule.enabled');
  }

  getTimeZone(): string {
    return this.configService.getOrThrow<string>('schedule.timeZone');
  }

  getOverview(): ScheduleOverview {
    return {
      enabled: this.isEnabled(),
      timeZone: this.getTimeZone(),
      cronJobs: this.listCronJobs(),
      intervals: this.listIntervals(),
      timeouts: this.listTimeouts(),
    };
  }

  listCronJobs(): ScheduleJobSnapshot[] {
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

  listIntervals(): ScheduleJobSnapshot[] {
    return this.schedulerRegistry
      .getIntervals()
      .map((name) => this.createTimerJobDto(name, 'interval'))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  listTimeouts(): ScheduleJobSnapshot[] {
    return this.schedulerRegistry
      .getTimeouts()
      .map((name) => this.createTimerJobDto(name, 'timeout'))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  addCronJob(options: AddCronJobOptions): boolean {
    if (
      this.isShuttingDown ||
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
      // AI modified: route cron callback failures through the application logger instead of cron's console fallback.
      errorHandler: (error) =>
        this.reportScheduleFailure(
          `Dynamic cron job "${options.name}" callback failed`,
          error,
        ),
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
    if (
      this.isShuttingDown ||
      !this.schedulerRegistry.doesExist('cron', name)
    ) {
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

  rescheduleCronJob(
    name: string,
    cronTime: CronJobParams['cronTime'],
  ): boolean {
    if (
      this.isShuttingDown ||
      !this.schedulerRegistry.doesExist('cron', name)
    ) {
      return false;
    }

    this.schedulerRegistry
      .getCronJob(name)
      .setTime(new CronTime(cronTime, this.getTimeZone()));
    return true;
  }

  addInterval(options: AddTimerOptions): boolean {
    if (
      this.isShuttingDown ||
      !this.isEnabled() ||
      this.schedulerRegistry.doesExist('interval', options.name)
    ) {
      return false;
    }

    const intervalRef = setInterval(() => {
      if (this.runningIntervals.has(options.name)) {
        return;
      }

      this.runningIntervals.add(options.name);
      this.startTimerCallback(options.name, options.onTick, () => {
        this.runningIntervals.delete(options.name);
      });
    }, options.milliseconds);
    this.schedulerRegistry.addInterval(options.name, intervalRef);
    this.managedIntervals.add(options.name);
    return true;
  }

  hasInterval(name: string): boolean {
    if (!this.schedulerRegistry.doesExist('interval', name)) {
      return false;
    }

    this.schedulerRegistry.getInterval(name);
    return true;
  }

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

  addTimeout(options: AddTimerOptions): boolean {
    if (
      this.isShuttingDown ||
      !this.isEnabled() ||
      this.schedulerRegistry.doesExist('timeout', options.name)
    ) {
      return false;
    }

    const timeoutRef = setTimeout(() => {
      this.startTimerCallback(options.name, options.onTick, () => {
        this.managedTimeouts.delete(options.name);
        if (this.schedulerRegistry.doesExist('timeout', options.name)) {
          this.schedulerRegistry.deleteTimeout(options.name);
        }
      });
    }, options.milliseconds);
    this.schedulerRegistry.addTimeout(options.name, timeoutRef);
    this.managedTimeouts.add(options.name);
    return true;
  }

  hasTimeout(name: string): boolean {
    if (!this.schedulerRegistry.doesExist('timeout', name)) {
      return false;
    }

    this.schedulerRegistry.getTimeout(name);
    return true;
  }

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

  private createTimerJobDto(
    name: string,
    type: 'interval' | 'timeout',
  ): ScheduleJobSnapshot {
    // AI modified: report ownership from the matching registry so shutdown responsibility is accurate.
    const isManaged =
      type === 'interval'
        ? this.managedIntervals.has(name)
        : this.managedTimeouts.has(name);

    return {
      name,
      type,
      active: true,
      managed: isManaged,
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

  private startTimerCallback(
    name: string,
    onTick: () => void | Promise<void>,
    onSettled: () => void,
  ): void {
    // AI modified: own dynamic callback promises so rejections and shutdown cannot escape the scheduler boundary.
    const callbackOperation = this.runTimerCallback(name, onTick, onSettled);
    this.runningTimerCallbacks.add(callbackOperation);
    void callbackOperation.then(() => {
      this.runningTimerCallbacks.delete(callbackOperation);
    });
  }

  private async runTimerCallback(
    name: string,
    onTick: () => void | Promise<void>,
    onSettled: () => void,
  ): Promise<void> {
    try {
      await onTick();
    } catch (error) {
      this.reportScheduleFailure(
        `Dynamic schedule callback "${name}" failed`,
        error,
      );
    } finally {
      try {
        onSettled();
      } catch (error) {
        this.reportScheduleFailure(
          `Dynamic schedule callback "${name}" cleanup failed`,
          error,
        );
      }
    }
  }

  private reportScheduleFailure(message: string, error: unknown): void {
    // AI modified: caught scheduler failures still reach Sentry before best-effort logging.
    captureBackgroundException(error);

    try {
      this.logger.error(
        message,
        error instanceof Error ? error.stack : String(error),
      );
    } catch {
      // AI modified: logger failure must not turn an observed timer rejection into an unhandled rejection.
    }
  }
}
