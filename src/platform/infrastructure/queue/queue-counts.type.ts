// AI modified: keep queue infrastructure state independent of feature-owned HTTP DTOs.
export interface QueueCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  prioritized: number;
  paused: number;
  waitingChildren: number;
}
