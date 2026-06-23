// CN: DTO 文件，定义 demo-queue 的数据结构；EN: DTO file defines data shapes for demo-queue.
export class DemoQueueWorkflowChildDto {
  id: string | null;
  name: string;
}

export class DemoQueueWorkflowDto {
  id: string | null;
  queue: string;
  name: string;
  enqueuedAt: string;
  children: DemoQueueWorkflowChildDto[];
}
