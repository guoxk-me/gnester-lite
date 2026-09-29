import { DemoEventLogRecordDto } from './demo-event-log-record.dto.js';

export class DemoEventOverviewDto {
  events!: string[];
  scenarios!: string[];
  records!: DemoEventLogRecordDto[];
}
