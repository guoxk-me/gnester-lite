import { DemoEventLogRecordDto } from './demo-event-log-record.dto.js';

export class DemoEventResultDto {
  scenario!: string;
  eventName!: string;
  emitted!: boolean;
  records!: DemoEventLogRecordDto[];
}
