export type DemoScheduleJobType = 'cron' | 'interval' | 'timeout';

export class DemoScheduleJobDto {
  name!: string;
  type!: DemoScheduleJobType;
  active!: boolean;
  managed!: boolean;
  lastRunAt!: string | null;
  nextRunAt!: string | null;
}
