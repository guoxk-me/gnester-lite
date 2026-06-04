// CN: DTO 文件，定义 schedule common 的数据结构；EN: DTO file defines data shapes for schedule common.
export type ScheduleJobType = 'cron' | 'interval' | 'timeout';

export class ScheduleJobDto {
  name: string;
  type: ScheduleJobType;
  active: boolean;
  managed: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
}
