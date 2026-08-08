import { DemoQueueCountsDto } from './demo-queue-counts.dto';

export class DemoQueueStatusDto {
  enabled!: boolean;
  queue!: string;
  counts!: DemoQueueCountsDto;
}
