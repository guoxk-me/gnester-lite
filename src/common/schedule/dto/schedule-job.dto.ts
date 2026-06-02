export type ScheduleJobType = 'cron' | 'interval' | 'timeout';

export class ScheduleJobDto {
  name: string;
  type: ScheduleJobType;
  active: boolean;
  managed: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
}
