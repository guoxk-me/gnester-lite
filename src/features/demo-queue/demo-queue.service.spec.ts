// CN: 测试文件，验证 demo-queue 的行为契约；EN: Test file verifies behavior contracts for demo-queue.
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FlowProducer, Queue } from 'bullmq';
import { CommonQueueService } from '../../common/queue/queue.service';
import {
  DEMO_QUEUE,
  DEMO_QUEUE_LONG_TASK_JOB,
  DEMO_QUEUE_SEND_EMAIL_JOB,
  DEMO_QUEUE_SUBTASK_JOB,
  DEMO_QUEUE_WORKFLOW_JOB,
} from './demo-queue.constants';
import { DemoQueueService } from './demo-queue.service';
import { DemoQueueJobData } from './demo-queue.types';
import { DemoQueueResultDto } from './dto/demo-queue-result.dto';

// CN: 测试分组：DemoQueueService；EN: Test group: DemoQueueService.
describe('DemoQueueService', () => {
  const queue = {} as Queue<DemoQueueJobData, DemoQueueResultDto, string>;
  const flowProducer: jest.Mocked<Pick<FlowProducer, 'add'>> = {
    add: jest.fn(),
  };
  const commonQueueService: jest.Mocked<
    Pick<
      CommonQueueService,
      'add' | 'getCounts' | 'isEnabled' | 'pause' | 'resume'
    >
  > = {
    add: jest.fn(),
    getCounts: jest.fn(),
    isEnabled: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
  };
  const configService: jest.Mocked<Pick<ConfigService, 'getOrThrow'>> = {
    getOrThrow: jest.fn(),
  };
  let service: DemoQueueService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    jest.clearAllMocks();
    commonQueueService.add.mockResolvedValue({
      id: '42',
      name: DEMO_QUEUE_SEND_EMAIL_JOB,
      timestamp: Date.parse('2026-05-28T00:00:00.000Z'),
    } as never);
    flowProducer.add.mockResolvedValue({
      job: {
        id: 'workflow-42',
        name: DEMO_QUEUE_WORKFLOW_JOB,
        timestamp: Date.parse('2026-05-28T00:00:00.000Z'),
      },
      children: [
        {
          job: {
            id: 'subtask-1',
            name: DEMO_QUEUE_SUBTASK_JOB,
          },
        },
      ],
    } as never);
    commonQueueService.getCounts.mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 1,
      failed: 0,
      delayed: 0,
      prioritized: 0,
      paused: 0,
      waitingChildren: 0,
    });
    commonQueueService.isEnabled.mockReturnValue(true);
    commonQueueService.pause.mockResolvedValue(undefined);
    commonQueueService.resume.mockResolvedValue(undefined);
    configService.getOrThrow.mockImplementation((key: string) => {
      const values = new Map<string, number>([
        ['queue.defaultAttempts', 3],
        ['queue.backoffDelay', 1000],
      ]);

      return values.get(key) as never;
    });
    service = new DemoQueueService(
      queue,
      flowProducer as FlowProducer,
      commonQueueService as CommonQueueService,
      configService as ConfigService,
    );
  });

  // CN: 测试用例：enqueues long running work with progress-friendly inputs；EN: Test case: enqueues long running work with progress-friendly inputs.
  it('enqueues long running work with progress-friendly inputs', async () => {
    commonQueueService.add.mockResolvedValueOnce({
      id: '43',
      name: DEMO_QUEUE_LONG_TASK_JOB,
      timestamp: Date.parse('2026-05-28T00:00:00.000Z'),
    } as never);

    await expect(
      service.enqueueLongTask({
        taskName: 'monthly-report',
        durationMs: 5_000,
        steps: 5,
      }),
    ).resolves.toEqual({
      id: '43',
      queue: DEMO_QUEUE,
      name: DEMO_QUEUE_LONG_TASK_JOB,
      enqueuedAt: '2026-05-28T00:00:00.000Z',
    });

    expect(commonQueueService.add).toHaveBeenCalledWith(
      queue,
      DEMO_QUEUE_LONG_TASK_JOB,
      expect.objectContaining({
        taskName: 'monthly-report',
        durationMs: 5_000,
        steps: 5,
        requestedAt: expect.any(String) as string,
      }),
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  });

  // CN: 测试用例：creates BullMQ flow jobs for parent child queue demos；EN: Test case: creates BullMQ flow jobs for parent child queue demos.
  it('creates BullMQ flow jobs for parent child queue demos', async () => {
    await expect(
      service.enqueueSubtaskWorkflow({
        workflowName: 'onboarding',
        subtasks: [
          {
            name: 'send-welcome-email',
            durationMs: 1_000,
          },
        ],
      }),
    ).resolves.toEqual({
      id: 'workflow-42',
      queue: DEMO_QUEUE,
      name: DEMO_QUEUE_WORKFLOW_JOB,
      enqueuedAt: '2026-05-28T00:00:00.000Z',
      children: [
        {
          id: 'subtask-1',
          name: DEMO_QUEUE_SUBTASK_JOB,
        },
      ],
    });

    expect(flowProducer.add).toHaveBeenCalledWith({
      name: DEMO_QUEUE_WORKFLOW_JOB,
      queueName: DEMO_QUEUE,
      data: {
        workflowName: 'onboarding',
        requestedAt: expect.any(String) as string,
      },
      opts: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
      children: [
        {
          name: DEMO_QUEUE_SUBTASK_JOB,
          queueName: DEMO_QUEUE,
          data: {
            workflowName: 'onboarding',
            subtaskName: 'send-welcome-email',
            durationMs: 1_000,
            requestedAt: expect.any(String) as string,
          },
          opts: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          },
        },
      ],
    });
  });

  // CN: 测试用例：blocks workflow creation when queues are disabled；EN: Test case: blocks workflow creation when queues are disabled.
  it('blocks workflow creation when queues are disabled', async () => {
    commonQueueService.isEnabled.mockReturnValueOnce(false);

    await expect(
      service.enqueueSubtaskWorkflow({
        workflowName: 'onboarding',
        subtasks: [
          {
            name: 'send-welcome-email',
            durationMs: 1_000,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(flowProducer.add).not.toHaveBeenCalled();
  });

  // CN: 测试用例：enqueues demo email work with the configured retry contract；EN: Test case: enqueues demo email work with the configured retry contract.
  it('enqueues demo email work with the configured retry contract', async () => {
    await expect(
      service.enqueueEmail({
        to: 'user@example.com',
        subject: 'Welcome',
      }),
    ).resolves.toEqual({
      id: '42',
      queue: DEMO_QUEUE,
      name: DEMO_QUEUE_SEND_EMAIL_JOB,
      enqueuedAt: '2026-05-28T00:00:00.000Z',
    });

    expect(commonQueueService.add).toHaveBeenCalledWith(
      queue,
      DEMO_QUEUE_SEND_EMAIL_JOB,
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Welcome',
        requestedAt: expect.any(String) as string,
      }),
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  });

  // CN: 测试用例：returns enabled state and BullMQ counts for operational inspection；EN: Test case: returns enabled state and BullMQ counts for operational inspection.
  it('returns enabled state and BullMQ counts for operational inspection', async () => {
    await expect(service.getStatus()).resolves.toEqual({
      enabled: true,
      queue: DEMO_QUEUE,
      counts: {
        waiting: 0,
        active: 0,
        completed: 1,
        failed: 0,
        delayed: 0,
        prioritized: 0,
        paused: 0,
        waitingChildren: 0,
      },
    });
  });

  // CN: 测试用例：delegates pause and resume to the common queue service；EN: Test case: delegates pause and resume to the common queue service.
  it('delegates pause and resume to the common queue service', async () => {
    await service.pause();
    await service.resume();

    expect(commonQueueService.pause).toHaveBeenCalledWith(queue);
    expect(commonQueueService.resume).toHaveBeenCalledWith(queue);
  });
});
