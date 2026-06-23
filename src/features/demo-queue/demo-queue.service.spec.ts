// CN: 测试文件，验证 demo-queue 的行为契约；EN: Test file verifies behavior contracts for demo-queue.
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { CommonQueueService } from '../../common/queue/queue.service';
import { DEMO_QUEUE, DEMO_QUEUE_SEND_EMAIL_JOB } from './demo-queue.constants';
import { DemoQueueService } from './demo-queue.service';
import { DemoEmailJobData } from './demo-queue.types';
import { DemoQueueResultDto } from './dto/demo-queue-result.dto';

// CN: 测试分组：DemoQueueService；EN: Test group: DemoQueueService.
describe('DemoQueueService', () => {
  const queue = {} as Queue<DemoEmailJobData, DemoQueueResultDto, string>;
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
      commonQueueService as CommonQueueService,
      configService as ConfigService,
    );
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
