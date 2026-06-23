// CN: 测试文件，验证 queue common 的行为契约；EN: Test file verifies behavior contracts for queue common.
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { CommonQueueService } from './queue.service';

// CN: 测试分组：CommonQueueService；EN: Test group: CommonQueueService.
describe('CommonQueueService', () => {
  const configService: jest.Mocked<Pick<ConfigService, 'getOrThrow'>> = {
    getOrThrow: jest.fn(),
  };
  const queue: jest.Mocked<
    Pick<Queue, 'add' | 'getJobCounts' | 'pause' | 'resume'>
  > = {
    add: jest.fn(),
    getJobCounts: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
  };
  let service: CommonQueueService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    jest.clearAllMocks();
    configService.getOrThrow.mockReturnValue(true);
    queue.add.mockResolvedValue({ id: '1' } as never);
    queue.getJobCounts.mockResolvedValue({
      waiting: 2,
      active: 1,
      completed: 5,
    });
    queue.pause.mockResolvedValue(undefined);
    queue.resume.mockResolvedValue(undefined);
    service = new CommonQueueService(configService as ConfigService);
  });

  // CN: 测试用例：adds jobs only when the queue switch is enabled；EN: Test case: adds jobs only when the queue switch is enabled.
  it('adds jobs only when the queue switch is enabled', async () => {
    await expect(
      service.add(queue as Queue<{ id: string }, unknown, string>, 'demo', {
        id: 'abc',
      }),
    ).resolves.toEqual({ id: '1' });

    expect(queue.add).toHaveBeenCalledWith('demo', { id: 'abc' }, undefined);
  });

  // CN: 测试用例：blocks job mutation when the queue switch is disabled；EN: Test case: blocks job mutation when the queue switch is disabled.
  it('blocks job mutation when the queue switch is disabled', async () => {
    configService.getOrThrow.mockReturnValue(false);

    await expect(
      service.add(queue as Queue<{ id: string }, unknown, string>, 'demo', {
        id: 'abc',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(queue.add).not.toHaveBeenCalled();
  });

  // CN: 测试用例：normalizes operational queue counts for status endpoints；EN: Test case: normalizes operational queue counts for status endpoints.
  it('normalizes operational queue counts for status endpoints', async () => {
    await expect(service.getCounts(queue as Queue)).resolves.toEqual({
      waiting: 2,
      active: 1,
      completed: 5,
      failed: 0,
      delayed: 0,
      prioritized: 0,
      paused: 0,
      waitingChildren: 0,
    });
  });

  // CN: 测试用例：delegates pause and resume to BullMQ queues；EN: Test case: delegates pause and resume to BullMQ queues.
  it('delegates pause and resume to BullMQ queues', async () => {
    await service.pause(queue as Queue);
    await service.resume(queue as Queue);

    expect(queue.pause).toHaveBeenCalled();
    expect(queue.resume).toHaveBeenCalled();
  });
});
