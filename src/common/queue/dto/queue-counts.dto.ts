// CN: DTO 文件，定义 queue common 的数据结构；EN: DTO file defines data shapes for queue common.
export class QueueCountsDto {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  prioritized: number;
  paused: number;
  waitingChildren: number;
}
