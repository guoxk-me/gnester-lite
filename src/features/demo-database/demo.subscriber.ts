import { Logger } from '@nestjs/common';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { Demo } from './entities/demo.entity';

// Use subscriber to listen to Demo entity events. 使用订阅器监听 Demo 实体事件。
@EventSubscriber()
export class DemoSubscriber implements EntitySubscriberInterface<Demo> {
  private readonly logger = new Logger(DemoSubscriber.name);

  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo(): typeof Demo {
    return Demo;
  }

  beforeInsert(event: InsertEvent<Demo>): void {
    this.logger.debug(`Before demo inserted: ${JSON.stringify(event.entity)}`);
  }
}
