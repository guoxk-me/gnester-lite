import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { CommonQueueService } from './queue.service';

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
    service = new CommonQueueService(configService as unknown as ConfigService);
  });

  it('adds jobs only when the queue switch is enabled', async () => {
    await expect(
      service.add(
        queue as unknown as Queue<{ id: string }, unknown, string>,
        'demo',
        {
          id: 'abc',
        },
      ),
    ).resolves.toEqual({ id: '1' });

    expect(queue.add).toHaveBeenCalledWith('demo', { id: 'abc' }, undefined);
  });

  it('blocks job mutation when the queue switch is disabled', async () => {
    configService.getOrThrow.mockReturnValue(false);

    await expect(
      service.add(
        queue as unknown as Queue<{ id: string }, unknown, string>,
        'demo',
        {
          id: 'abc',
        },
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('returns operational queue counts for status endpoints', async () => {
    await expect(service.getCounts(queue as unknown as Queue)).resolves.toEqual(
      {
        waiting: 2,
        active: 1,
        completed: 5,
        failed: 0,
        delayed: 0,
        prioritized: 0,
        paused: 0,
        waitingChildren: 0,
      },
    );
  });

  it('delegates pause and resume to BullMQ queues', async () => {
    await service.pause(queue as unknown as Queue);
    await service.resume(queue as unknown as Queue);

    expect(queue.pause).toHaveBeenCalled();
    expect(queue.resume).toHaveBeenCalled();
  });

  // AI modified: verifies Redis outages cannot hold HTTP-facing queue work indefinitely.
  it('fails queue operations after the availability budget expires', async () => {
    jest.useFakeTimers();
    queue.add.mockImplementationOnce(() => new Promise(() => undefined));

    const pendingJob = service.add(
      queue as unknown as Queue<{ id: string }, unknown, string>,
      'demo',
      { id: 'abc' },
    );
    const rejection = expect(pendingJob).rejects.toThrow(
      'mutation outcome may be unknown',
    );
    await jest.advanceTimersByTimeAsync(3_000);

    await rejection;
    jest.useRealTimers();
  });

  it('maps immediate Redis failures to ServiceUnavailableException', async () => {
    queue.getJobCounts.mockRejectedValueOnce(new Error('Redis unavailable'));

    await expect(
      service.getCounts(queue as unknown as Queue),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('serializes concurrent admissions so producers cannot overshoot capacity', async () => {
    let lockToken: string | undefined;
    let pendingJobs = 0;
    let continueFirstJob!: () => void;
    let markFirstJobStarted!: () => void;
    const firstJobStarted = new Promise<void>((resolve) => {
      markFirstJobStarted = resolve;
    });
    const firstJobCanFinish = new Promise<void>((resolve) => {
      continueFirstJob = resolve;
    });
    const redisClient = {
      defineCommand: jest.fn(),
      runCommand: jest.fn(
        (commandName: string, commandArguments: unknown[]) => {
          const commandToken = String(commandArguments[1]);

          if (commandName.includes('Acquire')) {
            if (lockToken !== undefined) {
              return Promise.resolve(0);
            }

            lockToken = commandToken;
            return Promise.resolve(1);
          }

          if (lockToken === commandToken) {
            lockToken = undefined;
            return Promise.resolve(1);
          }

          return Promise.resolve(0);
        },
      ),
    };
    const add = jest.fn(async (name: string) => {
      if (name === 'first') {
        markFirstJobStarted();
        await firstJobCanFinish;
      }

      pendingJobs += 1;
      return { id: name, name };
    });
    const capacityQueue = {
      add,
      client: Promise.resolve(redisClient),
      getJobCountByTypes: jest.fn(() => Promise.resolve(pendingJobs)),
      toKey: jest.fn(() => 'gnester:test:demo:admission-lock'),
    } as unknown as Queue<unknown, unknown, string>;

    const firstAdmission = service.addWithinPendingCapacity(
      capacityQueue,
      'first',
      {},
      1,
    );
    await firstJobStarted;
    const secondAdmission = service.addWithinPendingCapacity(
      capacityQueue,
      'second',
      {},
      1,
    );
    continueFirstJob();

    await expect(firstAdmission).resolves.toMatchObject({ id: 'first' });
    await expect(secondAdmission).rejects.toThrow('capacity');
    expect(add).toHaveBeenCalledTimes(1);
    expect(redisClient.defineCommand).toHaveBeenCalledTimes(2);
    expect(redisClient.runCommand).toHaveBeenCalledWith(
      expect.stringContaining('Release'),
      expect.arrayContaining([
        'gnester:test:demo:admission-lock',
        expect.any(String) as string,
      ]),
    );
  });

  it('releases admission after publication fails and preserves the backend error contract', async () => {
    const redisClient = {
      defineCommand: jest.fn(),
      runCommand: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(1),
    };
    const capacityQueue = {
      client: Promise.resolve(redisClient),
      getJobCountByTypes: jest.fn().mockResolvedValue(0),
      toKey: jest.fn(() => 'gnester:test:demo:admission-lock'),
    } as unknown as Queue;
    const publicationError = new Error('publication failed');

    await expect(
      service.runWithPendingCapacity(capacityQueue, 1, 100, () =>
        Promise.reject(publicationError),
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(redisClient.runCommand).toHaveBeenCalledTimes(2);
  });
});
