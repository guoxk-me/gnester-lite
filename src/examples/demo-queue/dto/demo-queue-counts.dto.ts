export class DemoQueueCountsDto {
  waiting!: number;
  active!: number;
  completed!: number;
  failed!: number;
  delayed!: number;
  prioritized!: number;
  paused!: number;
  waitingChildren!: number;
}
