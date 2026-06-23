// CN: DTO 文件，定义 demo-queue 的数据结构；EN: DTO file defines data shapes for demo-queue.
export class DemoQueueJobDto {
  id: string | null;
  queue: string;
  name: string;
  enqueuedAt: string;
}
