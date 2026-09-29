import { DemoQueueCountsDto } from './demo-queue-counts.dto.js';

export class DemoQueueStatusDto {
  enabled!: boolean;
  queue!: string;
  counts!: DemoQueueCountsDto;
}
