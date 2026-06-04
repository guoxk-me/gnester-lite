// CN: DTO 文件，定义 schedule common 的数据结构；EN: DTO file defines data shapes for schedule common.
import { ScheduleJobDto } from './schedule-job.dto';

export class ScheduleOverviewDto {
  enabled: boolean;
  timeZone: string;
  cronJobs: ScheduleJobDto[];
  intervals: ScheduleJobDto[];
  timeouts: ScheduleJobDto[];
}
