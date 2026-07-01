// CN: DTO 文件，定义 demo-events 的数据结构；EN: DTO file defines data shapes for demo-events.
export type DemoEventLogKind =
  | 'audit'
  | 'cache-invalidation'
  | 'notification'
  | 'trace';

export class DemoEventLogRecordDto {
  id: number;
  kind: DemoEventLogKind;
  scenario: string;
  eventName: string;
  message: string;
  recordedAt: string;
  metadata: Record<string, string>;
}
