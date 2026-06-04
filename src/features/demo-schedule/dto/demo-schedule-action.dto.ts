// CN: DTO 文件，定义 demo-schedule 的数据结构；EN: DTO file defines data shapes for demo-schedule.
import { ScheduleJobType } from '../../../common/schedule/dto/schedule-job.dto';

export type DemoScheduleAction =
  | 'delete'
  | 'register'
  | 'reschedule'
  | 'start'
  | 'stop';

export class DemoScheduleActionDto {
  name: string;
  type: ScheduleJobType;
  action: DemoScheduleAction;
  applied: boolean;
}
