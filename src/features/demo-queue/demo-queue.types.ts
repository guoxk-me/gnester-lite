// CN: 类型文件，描述 demo-queue 的 TypeScript 契约；EN: Type file describes TypeScript contracts for demo-queue.
export interface DemoEmailJobData {
  readonly to: string;
  readonly subject: string;
  readonly body?: string;
  readonly requestedAt: string;
}

export interface DemoLongTaskJobData {
  readonly taskName: string;
  readonly durationMs: number;
  readonly steps: number;
  readonly requestedAt: string;
}

export interface DemoWorkflowJobData {
  readonly workflowName: string;
  readonly requestedAt: string;
}

export interface DemoSubtaskJobData {
  readonly workflowName: string;
  readonly subtaskName: string;
  readonly durationMs: number;
  readonly requestedAt: string;
}

export type DemoQueueJobData =
  | DemoEmailJobData
  | DemoLongTaskJobData
  | DemoSubtaskJobData
  | DemoWorkflowJobData;
