import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
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
  constructor(private readonly demoQueueService: DemoQueueService) {}

  @Post('email')
  @HttpCode(HttpStatus.ACCEPTED)
  // AI modified: queue operations expose one bounded backend-unavailable contract.
  @ApiResponse({ status: 503, description: 'Queue backend is unavailable' })
  @ApiResponse({ status: 202, type: DemoQueueJobDto })
  enqueueEmail(
    @Body() createDemoEmailJobDto: CreateDemoEmailJobDto,
  ): Promise<DemoQueueJobDto> {
    return this.demoQueueService.enqueueEmail(createDemoEmailJobDto);
  }

  // AI modified: added a visible long-running queue scenario for API demos.
  @Post('long-task')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiResponse({ status: 503, description: 'Queue backend is unavailable' })
  @ApiResponse({ status: 202, type: DemoQueueJobDto })
  enqueueLongTask(
    @Body() createDemoLongTaskJobDto: CreateDemoLongTaskJobDto,
  ): Promise<DemoQueueJobDto> {
    return this.demoQueueService.enqueueLongTask(createDemoLongTaskJobDto);
  }

  // AI modified: added a parent-child workflow scenario for queue dependency demos.
  @Post('subtasks')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiResponse({ status: 503, description: 'Queue backend is unavailable' })
  @ApiResponse({ status: 202, type: DemoQueueWorkflowDto })
  enqueueSubtaskWorkflow(
    @Body() createDemoSubtaskWorkflowDto: CreateDemoSubtaskWorkflowDto,
  ): Promise<DemoQueueWorkflowDto> {
    return this.demoQueueService.enqueueSubtaskWorkflow(
      createDemoSubtaskWorkflowDto,
    );
  }

  @Get('status')
  @ApiResponse({ status: 503, description: 'Queue backend is unavailable' })
  @ApiResponse({ status: 200, type: DemoQueueStatusDto })
  getStatus(): Promise<DemoQueueStatusDto> {
    return this.demoQueueService.getStatus();
  }

  @Post('pause')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 503, description: 'Queue backend is unavailable' })
  @ApiResponse({ status: 204, description: 'Queue was paused' })
  pause(): Promise<void> {
    return this.demoQueueService.pause();
  }

  @Post('resume')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 503, description: 'Queue backend is unavailable' })
  @ApiResponse({ status: 204, description: 'Queue was resumed' })
  resume(): Promise<void> {
    return this.demoQueueService.resume();
  }
}
