import type { DemoScheduleJobType } from './demo-schedule-job.dto';

export type DemoScheduleAction =
  | 'delete'
  | 'register'
  | 'reschedule'
  | 'start'
  | 'stop';

export class DemoScheduleActionDto {
  name!: string;
  type!: DemoScheduleJobType;
  action!: DemoScheduleAction;
  applied!: boolean;
}
