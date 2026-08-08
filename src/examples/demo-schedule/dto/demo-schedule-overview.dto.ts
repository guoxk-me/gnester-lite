import { DemoScheduleJobDto } from './demo-schedule-job.dto';

export class DemoScheduleOverviewDto {
  enabled!: boolean;
  timeZone!: string;
  cronJobs!: DemoScheduleJobDto[];
  intervals!: DemoScheduleJobDto[];
  timeouts!: DemoScheduleJobDto[];
}
