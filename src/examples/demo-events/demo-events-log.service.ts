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

export const DEMO_EVENT_LOG_CAPACITY = 100;

@Injectable()
export class DemoEventsLogService {
  private nextId = 1;
  private readonly records: DemoEventLogRecordDto[] = [];

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
    if (this.records.length > DEMO_EVENT_LOG_CAPACITY) {
      // AI modified: keep the process-local demo log bounded for long-running environments.
      this.records.splice(0, this.records.length - DEMO_EVENT_LOG_CAPACITY);
    }

    return record;
  }

  cursor(): number {
    return this.nextId - 1;
  }

  findAll(): DemoEventLogRecordDto[] {
    return [...this.records];
  }

  findAfter(cursor: number): DemoEventLogRecordDto[] {
    return this.records.filter((record) => record.id > cursor);
  }

  clear(): void {
    this.records.length = 0;
    this.nextId = 1;
  }
}
