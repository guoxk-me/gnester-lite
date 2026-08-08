import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DemoQueueController } from './demo-queue.controller';
import { DemoQueueService } from './demo-queue.service';
import { CreateDemoEmailJobDto } from './dto/create-demo-email-job.dto';
import { CreateDemoLongTaskJobDto } from './dto/create-demo-long-task-job.dto';
import { CreateDemoSubtaskWorkflowDto } from './dto/create-demo-subtask-workflow.dto';

describe('DemoQueueController', () => {
  const service: jest.Mocked<
    Pick<
      DemoQueueService,
      | 'enqueueEmail'
      | 'enqueueLongTask'
      | 'enqueueSubtaskWorkflow'
      | 'getStatus'
      | 'pause'
      | 'resume'
    >
  > = {
    enqueueEmail: jest.fn(),
    enqueueLongTask: jest.fn(),
    enqueueSubtaskWorkflow: jest.fn(),
    getStatus: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
  };
  let controller: DemoQueueController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoQueueController],
      providers: [
        {
          provide: DemoQueueService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DemoQueueController>(DemoQueueController);
  });

  it('delegates demo email job creation to the service', async () => {
    const dto = {
      to: 'user@example.com',
      subject: 'Welcome',
    };
    const job = {
      id: '1',
      queue: 'demo',
      name: 'send-email',
      enqueuedAt: '2026-05-28T00:00:00.000Z',
    };
    service.enqueueEmail.mockResolvedValueOnce(job);

    await expect(controller.enqueueEmail(dto)).resolves.toEqual(job);
    expect(service.enqueueEmail).toHaveBeenCalledWith(dto);
  });

  it('delegates long task job creation to the service', async () => {
    const dto = {
      taskName: 'monthly-report',
      durationMs: 5_000,
      steps: 5,
    };
    const job = {
      id: '2',
      queue: 'demo',
      name: 'long-task',
      enqueuedAt: '2026-05-28T00:00:00.000Z',
    };
    service.enqueueLongTask.mockResolvedValueOnce(job);

    await expect(controller.enqueueLongTask(dto)).resolves.toEqual(job);
    expect(service.enqueueLongTask).toHaveBeenCalledWith(dto);
  });

  it('delegates subtask workflow creation to the service', async () => {
    const dto = {
      workflowName: 'onboarding',
      subtasks: [
        {
          name: 'send-welcome-email',
          durationMs: 1_000,
        },
      ],
    };
    const workflow = {
      id: 'workflow-1',
      queue: 'demo',
      name: 'workflow',
      enqueuedAt: '2026-05-28T00:00:00.000Z',
      children: [
        {
          id: 'subtask-1',
          name: 'subtask',
        },
      ],
    };
    service.enqueueSubtaskWorkflow.mockResolvedValueOnce(workflow);

    await expect(controller.enqueueSubtaskWorkflow(dto)).resolves.toEqual(
      workflow,
    );
    expect(service.enqueueSubtaskWorkflow).toHaveBeenCalledWith(dto);
  });

  it('delegates queue status reads to the service', async () => {
    const status = {
      enabled: true,
      queue: 'demo',
      counts: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        prioritized: 0,
        paused: 0,
        waitingChildren: 0,
      },
    };
    service.getStatus.mockResolvedValueOnce(status);

    await expect(controller.getStatus()).resolves.toEqual(status);
    expect(service.getStatus).toHaveBeenCalled();
  });

  it('delegates queue pause and resume commands to the service', async () => {
    service.pause.mockResolvedValueOnce(undefined);
    service.resume.mockResolvedValueOnce(undefined);

    await expect(controller.pause()).resolves.toBeUndefined();
    await expect(controller.resume()).resolves.toBeUndefined();
    expect(service.pause).toHaveBeenCalled();
    expect(service.resume).toHaveBeenCalled();
  });

  it.each(['', '   '])(
    'rejects the blank email subject %j',
    async (subject) => {
      const dto = plainToInstance(CreateDemoEmailJobDto, {
        to: 'user@example.com',
        subject,
      });

      await expect(validate(dto)).resolves.not.toHaveLength(0);
    },
  );

  it.each(['', '   '])(
    'rejects the blank long-task name %j',
    async (taskName) => {
      const dto = plainToInstance(CreateDemoLongTaskJobDto, {
        taskName,
        durationMs: 5_000,
        steps: 5,
      });

      await expect(validate(dto)).resolves.not.toHaveLength(0);
    },
  );

  it.each([
    ['workflow name', '   ', 'subtask'],
    ['subtask name', 'workflow', '   '],
  ])('rejects a blank %s', async (_scenario, workflowName, subtaskName) => {
    const dto = plainToInstance(CreateDemoSubtaskWorkflowDto, {
      workflowName,
      subtasks: [{ name: subtaskName, durationMs: 1_000 }],
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
    expect(service.enqueueSubtaskWorkflow).not.toHaveBeenCalled();
  });
});
