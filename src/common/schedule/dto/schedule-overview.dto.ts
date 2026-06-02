import { ScheduleJobDto } from './schedule-job.dto';

export class ScheduleOverviewDto {
  enabled: boolean;
  timeZone: string;
  cronJobs: ScheduleJobDto[];
  intervals: ScheduleJobDto[];
  timeouts: ScheduleJobDto[];
}
