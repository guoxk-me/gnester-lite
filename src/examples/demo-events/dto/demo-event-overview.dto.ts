import { DemoEventLogRecordDto } from './demo-event-log-record.dto';

export class DemoEventOverviewDto {
  events!: string[];
  scenarios!: string[];
  records!: DemoEventLogRecordDto[];
}
