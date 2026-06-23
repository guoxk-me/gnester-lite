// CN: 控制器，定义 demo-queue 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-queue.
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { CreateDemoEmailJobDto } from './dto/create-demo-email-job.dto';
import { CreateDemoLongTaskJobDto } from './dto/create-demo-long-task-job.dto';
import { CreateDemoSubtaskWorkflowDto } from './dto/create-demo-subtask-workflow.dto';
import { DemoQueueJobDto } from './dto/demo-queue-job.dto';
import { DemoQueueStatusDto } from './dto/demo-queue-status.dto';
import { DemoQueueWorkflowDto } from './dto/demo-queue-workflow.dto';
import { DemoQueueService } from './demo-queue.service';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-queue',
})
export class DemoQueueController {
  // CN: 初始化 demo-queue 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-queue.
  constructor(private readonly demoQueueService: DemoQueueService) {}

  // CN: 处理 demo-queue 的 enqueue email HTTP 请求；EN: Handles the enqueue email HTTP request for demo-queue.
  @Post('email')
  @HttpCode(HttpStatus.ACCEPTED)
  enqueueEmail(
    @Body() createDemoEmailJobDto: CreateDemoEmailJobDto,
  ): Promise<DemoQueueJobDto> {
    return this.demoQueueService.enqueueEmail(createDemoEmailJobDto);
  }

  // AI modified: added a visible long-running queue scenario for API demos.
  @Post('long-task')
  @HttpCode(HttpStatus.ACCEPTED)
  enqueueLongTask(
    @Body() createDemoLongTaskJobDto: CreateDemoLongTaskJobDto,
  ): Promise<DemoQueueJobDto> {
    return this.demoQueueService.enqueueLongTask(createDemoLongTaskJobDto);
  }

  // AI modified: added a parent-child workflow scenario for queue dependency demos.
  @Post('subtasks')
  @HttpCode(HttpStatus.ACCEPTED)
  enqueueSubtaskWorkflow(
    @Body() createDemoSubtaskWorkflowDto: CreateDemoSubtaskWorkflowDto,
  ): Promise<DemoQueueWorkflowDto> {
    return this.demoQueueService.enqueueSubtaskWorkflow(
      createDemoSubtaskWorkflowDto,
    );
  }

  // CN: 处理 demo-queue 的 get status HTTP 请求；EN: Handles the get status HTTP request for demo-queue.
  @Get('status')
  getStatus(): Promise<DemoQueueStatusDto> {
    return this.demoQueueService.getStatus();
  }

  // CN: 处理 demo-queue 的 pause HTTP 请求；EN: Handles the pause HTTP request for demo-queue.
  @Post('pause')
  @HttpCode(HttpStatus.NO_CONTENT)
  pause(): Promise<void> {
    return this.demoQueueService.pause();
  }

  // CN: 处理 demo-queue 的 resume HTTP 请求；EN: Handles the resume HTTP request for demo-queue.
  @Post('resume')
  @HttpCode(HttpStatus.NO_CONTENT)
  resume(): Promise<void> {
    return this.demoQueueService.resume();
  }
}
