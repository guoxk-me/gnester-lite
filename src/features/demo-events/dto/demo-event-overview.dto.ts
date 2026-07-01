// CN: DTO 文件，定义 demo-events 的数据结构；EN: DTO file defines data shapes for demo-events.
import { DemoEventLogRecordDto } from './demo-event-log-record.dto';

export class DemoEventOverviewDto {
  events: string[];
  scenarios: string[];
  records: DemoEventLogRecordDto[];
}
