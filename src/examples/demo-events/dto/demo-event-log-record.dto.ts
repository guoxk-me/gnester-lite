export type DemoEventLogKind =
  | 'audit'
  | 'cache-invalidation'
  | 'notification'
  | 'trace';

export class DemoEventLogRecordDto {
  id!: number;
  kind!: DemoEventLogKind;
  scenario!: string;
  eventName!: string;
  message!: string;
  recordedAt!: string;
  metadata!: Record<string, string>;
}
