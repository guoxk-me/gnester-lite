export class DemoQueueResultDto {
  delivered?: boolean;
  completed?: boolean;
  workflowCompleted?: boolean;
  handledAt!: string;
}
