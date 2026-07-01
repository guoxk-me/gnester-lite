// CN: 服务，承载 demo-events 的业务逻辑；EN: Service holds business logic for demo-events.
import { Injectable } from '@nestjs/common';
import {
  DemoEventLogKind,
  DemoEventLogRecordDto,
} from './dto/demo-event-log-record.dto';

type DemoEventLogInput = {
  kind: DemoEventLogKind;
  scenario: string;
  eventName: string;
  message: string;
  metadata?: Record<string, string>;
};

@Injectable()
export class DemoEventsLogService {
  private nextId = 1;
  private readonly records: DemoEventLogRecordDto[] = [];

  // CN: 执行 demo-events 的 record 业务逻辑；EN: Runs the record business logic for demo-events.
  record(input: DemoEventLogInput): DemoEventLogRecordDto {
    const record: DemoEventLogRecordDto = {
      id: this.nextId,
      kind: input.kind,
      scenario: input.scenario,
      eventName: input.eventName,
      message: input.message,
      recordedAt: new Date().toISOString(),
      metadata: input.metadata ?? {},
    };

    this.nextId += 1;
    this.records.push(record);

    return record;
  }

  // CN: 执行 demo-events 的 count 业务逻辑；EN: Runs the count business logic for demo-events.
  count(): number {
    return this.records.length;
  }

  // CN: 执行 demo-events 的 find all 业务逻辑；EN: Runs the find all business logic for demo-events.
  findAll(): DemoEventLogRecordDto[] {
    return [...this.records];
  }

  // CN: 执行 demo-events 的 find since 业务逻辑；EN: Runs the find since business logic for demo-events.
  findSince(index: number): DemoEventLogRecordDto[] {
    return this.records.slice(index);
  }

  // CN: 执行 demo-events 的 clear 业务逻辑；EN: Runs the clear business logic for demo-events.
  clear(): void {
    this.records.length = 0;
    this.nextId = 1;
  }
}
