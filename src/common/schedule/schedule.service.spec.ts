// CN: 测试文件，验证 schedule common 的行为契约；EN: Test file verifies behavior contracts for schedule common.
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob, CronTime } from 'cron';
import { CommonScheduleService } from './schedule.service';

// CN: 测试分组：CommonScheduleService；EN: Test group: CommonScheduleService.
describe('CommonScheduleService', () => {
  const configService: jest.Mocked<Pick<ConfigService, 'getOrThrow'>> = {
    getOrThrow: jest.fn(),
  };
  const schedulerRegistry: jest.Mocked<
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
  > = {
    addCronJob: jest.fn(),
    addInterval: jest.fn(),
    addTimeout: jest.fn(),
    deleteCronJob: jest.fn(),
    deleteInterval: jest.fn(),
    deleteTimeout: jest.fn(),
    doesExist: jest.fn(),
    getCronJob: jest.fn(),
    getCronJobs: jest.fn(),
    getInterval: jest.fn(),
    getIntervals: jest.fn(),
    getTimeout: jest.fn(),
    getTimeouts: jest.fn(),
  };
  let service: CommonScheduleService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    jest.clearAllMocks();
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
    service = new CommonScheduleService(
      configService as ConfigService,
      schedulerRegistry as SchedulerRegistry,
    );
  });

  // CN: 测试清理，组织或验证测试流程；EN: Test cleanup organizes or verifies the test flow.
  afterEach(() => {
    jest.useRealTimers();
  });

  // CN: 测试用例：reads the schedule switch and default time zone from configuration；EN: Test case: reads the schedule switch and default time zone from configuration.
  it('reads the schedule switch and default time zone from configuration', () => {
    expect(service.isEnabled()).toBe(true);
    expect(service.getTimeZone()).toBe('Asia/Shanghai');
    expect(configService.getOrThrow).toHaveBeenCalledWith('schedule.enabled');
    expect(configService.getOrThrow).toHaveBeenCalledWith('schedule.timeZone');
  });

  // CN: 测试用例：lists cron, interval, and timeout jobs in a stable operational shape；EN: Test case: lists cron, interval, and timeout jobs in a stable operational shape.
  it('lists cron, interval, and timeout jobs in a stable operational shape', () => {
    const activeJob = {
      isActive: true,
      lastDate: jest.fn(() => new Date('2026-05-28T01:00:00.000Z')),
      nextDate: jest.fn(() => ({
        toJSDate: () => new Date('2026-05-28T02:00:00.000Z'),
      })),
    } as unknown as CronJob;
    const expiredJob = {
      isActive: false,
      lastDate: jest.fn(() => null),
      nextDate: jest.fn(() => {
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

  // CN: 测试用例：does not register dynamic cron jobs while scheduling is disabled；EN: Test case: does not register dynamic cron jobs while scheduling is disabled.
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
        onTick: jest.fn(),
      }),
    ).toBe(false);
    expect(schedulerRegistry.addCronJob).not.toHaveBeenCalled();
  });

  // CN: 测试用例：registers dynamic cron jobs with template defaults；EN: Test case: registers dynamic cron jobs with template defaults.
  it('registers dynamic cron jobs with template defaults', async () => {
    expect(
      service.addCronJob({
        name: 'dynamic',
        cronTime: '* * * * * *',
        onTick: jest.fn(),
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

  // CN: 测试用例：stops and deletes only managed dynamic cron jobs on shutdown；EN: Test case: stops and deletes only managed dynamic cron jobs on shutdown.
  it('stops and deletes only managed dynamic cron jobs on shutdown', async () => {
    const job = {
      stop: jest.fn(),
    };
    service.addCronJob({
      name: 'dynamic',
      cronTime: '* * * * * *',
      onTick: jest.fn(),
      start: false,
    });
    schedulerRegistry.doesExist.mockReturnValue(true);
    schedulerRegistry.getCronJob.mockReturnValue(job as unknown as CronJob);

    await service.onApplicationShutdown();

    expect(job.stop).toHaveBeenCalled();
    expect(schedulerRegistry.deleteCronJob).toHaveBeenCalledWith('dynamic');
  });

  // CN: 测试用例：starts and stops named cron jobs through the dynamic registry API；EN: Test case: starts and stops named cron jobs through the dynamic registry API.
  it('starts and stops named cron jobs through the dynamic registry API', async () => {
    const job = {
      start: jest.fn(),
      stop: jest.fn(),
    };
    schedulerRegistry.doesExist.mockReturnValue(true);
    schedulerRegistry.getCronJob.mockReturnValue(job as unknown as CronJob);

    expect(service.startCronJob('dynamic')).toBe(true);
    expect(await service.stopCronJob('dynamic')).toBe(true);

    expect(schedulerRegistry.getCronJob).toHaveBeenCalledWith('dynamic');
    expect(job.start).toHaveBeenCalled();
    expect(job.stop).toHaveBeenCalled();
  });

  // CN: 测试用例：reschedules named cron jobs with the configured time zone；EN: Test case: reschedules named cron jobs with the configured time zone.
  it('reschedules named cron jobs with the configured time zone', () => {
    const setTime = jest.fn<void, [CronTime]>();
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

  // CN: 测试用例：registers and deletes dynamic interval jobs；EN: Test case: registers and deletes dynamic interval jobs.
  it('registers and deletes dynamic interval jobs', () => {
    jest.useFakeTimers();
    const onTick = jest.fn();
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
    jest.advanceTimersByTime(1_000);
    expect(onTick).toHaveBeenCalledTimes(1);

    schedulerRegistry.doesExist.mockReturnValue(true);
    expect(service.hasInterval('poll')).toBe(true);
    expect(service.deleteInterval('poll')).toBe(true);
    expect(schedulerRegistry.getInterval).toHaveBeenCalledWith('poll');
    expect(schedulerRegistry.deleteInterval).toHaveBeenCalledWith('poll');
  });

  // CN: 测试用例：registers dynamic timeout jobs and removes them after they fire；EN: Test case: registers dynamic timeout jobs and removes them after they fire.
  it('registers dynamic timeout jobs and removes them after they fire', () => {
    jest.useFakeTimers();
    const onTick = jest.fn();
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
    jest.advanceTimersByTime(1_000);

    expect(onTick).toHaveBeenCalledTimes(1);
    expect(schedulerRegistry.deleteTimeout).toHaveBeenCalledWith('warmup');
  });
});
