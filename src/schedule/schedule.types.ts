export type ScheduleJobType = 'cron' | 'interval' | 'timeout';

// AI modified: expose scheduler state without coupling the platform service to Demo HTTP DTOs.
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
