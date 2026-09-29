import type { Mocked } from 'vitest';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob, CronTime } from 'cron';
import { captureBackgroundException } from '../sentry/with-sentry-isolation.js';
import { ScheduleService } from './schedule.service.js';

vi.mock('../sentry/with-sentry-isolation', () => ({
  captureBackgroundException: vi.fn(),
}));

describe('ScheduleService', () => {
  const configService = {
    getOrThrow: vi.fn(),
  } as unknown as Mocked<Pick<ConfigService, 'getOrThrow'>>;
  const schedulerRegistry = {
    addCronJob: vi.fn(),
    addInterval: vi.fn(),
    addTimeout: vi.fn(),
    deleteCronJob: vi.fn(),
    deleteInterval: vi.fn(),
    deleteTimeout: vi.fn(),
    doesExist: vi.fn(),
    getCronJob: vi.fn(),
    getCronJobs: vi.fn(),
    getInterval: vi.fn(),
    getIntervals: vi.fn(),
    getTimeout: vi.fn(),
    getTimeouts: vi.fn(),
  } as Mocked<
    Pick<
      SchedulerRegistry,
      | 'addCronJob'
      | 'addInterval'
      | 'addTimeout'
      | 'deleteCronJob'
      | 'deleteInterval'
      | 'deleteTimeout'
      | 'doesExist'
      | 'getCronJob'
      | 'getCronJobs'
      | 'getInterval'
      | 'getIntervals'
      | 'getTimeout'
      | 'getTimeouts'
    >
  >;
  let service: ScheduleService;

  beforeEach(() => {
    vi.clearAllMocks();
    configService.getOrThrow.mockImplementation((key: string) => {
      if (key === 'schedule.enabled') {
        return true;
      }

      if (key === 'schedule.timeZone') {
        return 'Asia/Shanghai';
      }

      throw new Error(`Unexpected config key: ${key}`);
    });
    schedulerRegistry.doesExist.mockReturnValue(false);
    schedulerRegistry.getCronJobs.mockReturnValue(new Map());
    schedulerRegistry.getIntervals.mockReturnValue([]);
    schedulerRegistry.getTimeouts.mockReturnValue([]);
    service = new ScheduleService(
      configService as unknown as ConfigService,
      schedulerRegistry as unknown as SchedulerRegistry,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads the schedule switch and default time zone from configuration', () => {
    expect(service.isEnabled()).toBe(true);
    expect(service.getTimeZone()).toBe('Asia/Shanghai');
    expect(configService.getOrThrow).toHaveBeenCalledWith('schedule.enabled');
    expect(configService.getOrThrow).toHaveBeenCalledWith('schedule.timeZone');
  });

  it('lists cron, interval, and timeout jobs in a stable operational shape', () => {
    const activeJob = {
      isActive: true,
      lastDate: vi.fn(() => new Date('2026-05-28T01:00:00.000Z')),
      nextDate: vi.fn(() => ({
        toJSDate: () => new Date('2026-05-28T02:00:00.000Z'),
      })),
    } as unknown as CronJob;
    const expiredJob = {
      isActive: false,
      lastDate: vi.fn(() => null),
      nextDate: vi.fn(() => {
        throw new Error('next fire date is in the past');
      }),
    } as unknown as CronJob;
    schedulerRegistry.getCronJobs.mockReturnValue(
      new Map([
        ['z-cron', expiredJob],
        ['a-cron', activeJob],
      ]),
    );
    schedulerRegistry.getIntervals.mockReturnValue(['poll']);
    schedulerRegistry.getTimeouts.mockReturnValue(['warmup']);

    expect(service.getOverview()).toEqual({
      enabled: true,
      timeZone: 'Asia/Shanghai',
      cronJobs: [
        {
          name: 'a-cron',
          type: 'cron',
          active: true,
          managed: false,
          lastRunAt: '2026-05-28T01:00:00.000Z',
          nextRunAt: '2026-05-28T02:00:00.000Z',
        },
        {
          name: 'z-cron',
          type: 'cron',
          active: false,
          managed: false,
          lastRunAt: null,
          nextRunAt: null,
        },
      ],
      intervals: [
        {
          name: 'poll',
          type: 'interval',
          active: true,
          managed: false,
          lastRunAt: null,
          nextRunAt: null,
        },
      ],
      timeouts: [
        {
          name: 'warmup',
          type: 'timeout',
          active: true,
          managed: false,
          lastRunAt: null,
          nextRunAt: null,
        },
      ],
    });
  });

  it('does not register dynamic cron jobs while scheduling is disabled', () => {
    configService.getOrThrow.mockImplementation((key: string) => {
      if (key === 'schedule.enabled') {
        return false;
      }

      if (key === 'schedule.timeZone') {
        return 'Asia/Shanghai';
      }

      throw new Error(`Unexpected config key: ${key}`);
    });

    expect(
      service.addCronJob({
        name: 'disabled',
        cronTime: '* * * * * *',
        onTick: () => undefined,
      }),
    ).toBe(false);
    expect(schedulerRegistry.addCronJob).not.toHaveBeenCalled();
  });

  it('registers dynamic cron jobs with template defaults', async () => {
    expect(
      service.addCronJob({
        name: 'dynamic',
        cronTime: '* * * * * *',
        onTick: () => undefined,
        start: false,
      }),
    ).toBe(true);
    expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith(
      'dynamic',
      expect.any(CronJob),
    );

    const registeredJob = schedulerRegistry.addCronJob.mock.calls[0][1];
    expect(registeredJob.waitForCompletion).toBe(true);
    expect(registeredJob.name).toBe('dynamic');
    await registeredJob.stop();
  });

  it('reports rejected dynamic cron callbacks through the application logger', async () => {
    const callbackError = new Error('cron failed');
    const loggerError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    service.addCronJob({
      name: 'failing-cron',
      cronTime: '* * * * * *',
      onTick: () => Promise.reject(callbackError),
      start: false,
    });
    const registeredJob = schedulerRegistry.addCronJob.mock.calls[0][1];

    await registeredJob.fireOnTick();

    expect(loggerError).toHaveBeenCalledWith(
      'Dynamic cron job "failing-cron" callback failed',
      expect.stringContaining('cron failed'),
    );
    expect(captureBackgroundException).toHaveBeenCalledWith(callbackError);
  });

  it('stops and deletes only managed dynamic cron jobs on shutdown', async () => {
    const job = {
      stop: vi.fn(),
    };
    service.addCronJob({
      name: 'dynamic',
      cronTime: '* * * * * *',
      onTick: () => undefined,
      start: false,
    });
    schedulerRegistry.doesExist.mockReturnValue(true);
    schedulerRegistry.getCronJob.mockReturnValue(job as unknown as CronJob);

    await service.onApplicationShutdown();

    expect(job.stop).toHaveBeenCalled();
    expect(schedulerRegistry.deleteCronJob).toHaveBeenCalledWith('dynamic');
  });

  it('starts and stops named cron jobs through the dynamic registry API', async () => {
    const job = {
      start: vi.fn(),
      stop: vi.fn(),
    };
    schedulerRegistry.doesExist.mockReturnValue(true);
    schedulerRegistry.getCronJob.mockReturnValue(job as unknown as CronJob);

    expect(service.startCronJob('dynamic')).toBe(true);
    expect(await service.stopCronJob('dynamic')).toBe(true);

    expect(schedulerRegistry.getCronJob).toHaveBeenCalledWith('dynamic');
    expect(job.start).toHaveBeenCalled();
    expect(job.stop).toHaveBeenCalled();
  });

  it('reschedules named cron jobs with the configured time zone', () => {
    const setTime = vi.fn<(...args: [CronTime]) => void>();
    const job = {
      setTime,
    };
    schedulerRegistry.doesExist.mockReturnValue(true);
    schedulerRegistry.getCronJob.mockReturnValue(job as unknown as CronJob);

    expect(service.rescheduleCronJob('dynamic', '15 * * * * *')).toBe(true);

    const cronTime = setTime.mock.calls[0][0];
    expect(cronTime).toBeInstanceOf(CronTime);
    expect(cronTime.timeZone).toBe('Asia/Shanghai');
  });

  it('registers and deletes dynamic interval jobs', async () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    schedulerRegistry.doesExist.mockImplementation(
      (type, name) => type === 'interval' && name === 'poll',
    );

    schedulerRegistry.doesExist.mockReturnValueOnce(false);
    expect(
      service.addInterval({
        name: 'poll',
        milliseconds: 1_000,
        onTick,
      }),
    ).toBe(true);

    expect(schedulerRegistry.addInterval).toHaveBeenCalledWith(
      'poll',
      expect.anything(),
    );
    schedulerRegistry.getIntervals.mockReturnValue(['poll']);
    expect(service.listIntervals()).toEqual([
      expect.objectContaining({ name: 'poll', managed: true }),
    ]);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(onTick).toHaveBeenCalledTimes(1);

    schedulerRegistry.doesExist.mockReturnValue(true);
    expect(service.hasInterval('poll')).toBe(true);
    expect(service.deleteInterval('poll')).toBe(true);
    expect(schedulerRegistry.getInterval).toHaveBeenCalledWith('poll');
    expect(schedulerRegistry.deleteInterval).toHaveBeenCalledWith('poll');
  });

  it('registers dynamic timeout jobs and removes them after they fire', async () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    schedulerRegistry.doesExist
      .mockReturnValueOnce(false)
      .mockReturnValue(true);

    expect(
      service.addTimeout({
        name: 'warmup',
        milliseconds: 1_000,
        onTick,
      }),
    ).toBe(true);

    expect(schedulerRegistry.addTimeout).toHaveBeenCalledWith(
      'warmup',
      expect.anything(),
    );
    schedulerRegistry.getTimeouts.mockReturnValue(['warmup']);
    expect(service.listTimeouts()).toEqual([
      expect.objectContaining({ name: 'warmup', managed: true }),
    ]);
    await vi.advanceTimersByTimeAsync(1_000);

    expect(onTick).toHaveBeenCalledTimes(1);
    expect(schedulerRegistry.deleteTimeout).toHaveBeenCalledWith('warmup');
  });

  it('logs rejected dynamic callbacks and still removes one-time timers', async () => {
    vi.useFakeTimers();
    const callbackError = new Error('timer failed');
    const loggerError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    schedulerRegistry.doesExist
      .mockReturnValueOnce(false)
      .mockReturnValue(true);

    service.addTimeout({
      name: 'failing-timeout',
      milliseconds: 1_000,
      onTick: () => Promise.reject(callbackError),
    });
    await vi.advanceTimersByTimeAsync(1_000);

    expect(loggerError).toHaveBeenCalledWith(
      'Dynamic schedule callback "failing-timeout" failed',
      expect.stringContaining('timer failed'),
    );
    expect(schedulerRegistry.deleteTimeout).toHaveBeenCalledWith(
      'failing-timeout',
    );
    loggerError.mockRestore();
  });

  it('captures a rejected timer even when application logging fails', async () => {
    vi.useFakeTimers();
    const callbackError = new Error('timer failed');
    vi.spyOn(Logger.prototype, 'error').mockImplementationOnce(() => {
      throw new Error('logger failed');
    });
    schedulerRegistry.doesExist
      .mockReturnValueOnce(false)
      .mockReturnValue(true);

    service.addTimeout({
      name: 'failing-timeout',
      milliseconds: 1_000,
      onTick: () => Promise.reject(callbackError),
    });
    await vi.advanceTimersByTimeAsync(1_000);

    expect(captureBackgroundException).toHaveBeenCalledWith(callbackError);
    expect(schedulerRegistry.deleteTimeout).toHaveBeenCalledWith(
      'failing-timeout',
    );
  });

  it('does not overlap a dynamic interval callback', async () => {
    vi.useFakeTimers();
    let finishFirstTick!: () => void;
    const firstTick = new Promise<void>((resolve) => {
      finishFirstTick = resolve;
    });
    const onTick = vi.fn<(...args: []) => Promise<void>>()
      .mockReturnValueOnce(firstTick)
      .mockResolvedValue(undefined);

    service.addInterval({
      name: 'non-overlapping',
      milliseconds: 1_000,
      onTick,
    });
    await vi.advanceTimersByTimeAsync(3_000);
    expect(onTick).toHaveBeenCalledTimes(1);

    finishFirstTick();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it('stops future ticks and waits for a running timer during shutdown', async () => {
    vi.useFakeTimers();
    let finishTick!: () => void;
    const runningTick = new Promise<void>((resolve) => {
      finishTick = resolve;
    });
    const onTick = vi.fn(() => runningTick);

    service.addInterval({
      name: 'shutdown-interval',
      milliseconds: 1_000,
      onTick,
    });
    const intervalRef = schedulerRegistry.addInterval.mock.calls[0][1] as
      | NodeJS.Timeout
      | undefined;
    schedulerRegistry.doesExist.mockImplementation(
      (type, name) => type === 'interval' && name === 'shutdown-interval',
    );
    schedulerRegistry.getInterval.mockReturnValue(intervalRef);
    schedulerRegistry.deleteInterval.mockImplementation(() => {
      clearInterval(intervalRef);
    });
    await vi.advanceTimersByTimeAsync(1_000);

    let hasShutdownCompleted = false;
    const shutdown = service.onApplicationShutdown().then(() => {
      hasShutdownCompleted = true;
    });
    await Promise.resolve();
    expect(hasShutdownCompleted).toBe(false);
    expect(
      service.addInterval({
        name: 'late-interval',
        milliseconds: 1_000,
        onTick: () => undefined,
      }),
    ).toBe(false);

    finishTick();
    await shutdown;
    await vi.advanceTimersByTimeAsync(2_000);

    expect(onTick).toHaveBeenCalledTimes(1);
    expect(hasShutdownCompleted).toBe(true);
  });
});
