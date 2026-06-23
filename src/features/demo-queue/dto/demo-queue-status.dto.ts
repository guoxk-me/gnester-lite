// CN: DTO 文件，定义 demo-queue 的数据结构；EN: DTO file defines data shapes for demo-queue.
import { QueueCountsDto } from '../../../common/queue/dto/queue-counts.dto';

export class DemoQueueStatusDto {
  enabled: boolean;
  queue: string;
  counts: QueueCountsDto;
}
