import type { CronJobParams } from 'cron';

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
