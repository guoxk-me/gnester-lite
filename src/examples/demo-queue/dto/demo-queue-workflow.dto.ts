export class DemoQueueWorkflowChildDto {
  id!: string | null;
  name!: string;
}

export class DemoQueueWorkflowDto {
  id!: string | null;
  queue!: string;
  name!: string;
  enqueuedAt!: string;
  children!: DemoQueueWorkflowChildDto[];
}
