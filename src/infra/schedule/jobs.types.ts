export type ScheduleJobType = 'cron' | 'interval' | 'timeout';

export interface ScheduleJobSnapshot {
  name: string;
  type: ScheduleJobType;
  active: boolean;
  managed: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

export interface ScheduleOverview {
  enabled: boolean;
  timeZone: string;
  cronJobs: ScheduleJobSnapshot[];
  intervals: ScheduleJobSnapshot[];
  timeouts: ScheduleJobSnapshot[];
}
