import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { CommonScheduleService } from './schedule.service';

describe('CommonScheduleService', () => {
  const configService: jest.Mocked<Pick<ConfigService, 'getOrThrow'>> = {
    getOrThrow: jest.fn(),
  };
  const schedulerRegistry: jest.Mocked<
    Pick<
      SchedulerRegistry,
      | 'addCronJob'
      | 'deleteCronJob'
      | 'doesExist'
      | 'getCronJob'
      | 'getCronJobs'
      | 'getIntervals'
      | 'getTimeouts'
    >
  > = {
    addCronJob: jest.fn(),
    deleteCronJob: jest.fn(),
    doesExist: jest.fn(),
    getCronJob: jest.fn(),
    getCronJobs: jest.fn(),
    getIntervals: jest.fn(),
    getTimeouts: jest.fn(),
  };
  let service: CommonScheduleService;

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

  it('reads the schedule switch and default time zone from configuration', () => {
    expect(service.isEnabled()).toBe(true);
    expect(service.getTimeZone()).toBe('Asia/Shanghai');
    expect(configService.getOrThrow).toHaveBeenCalledWith('schedule.enabled');
    expect(configService.getOrThrow).toHaveBeenCalledWith('schedule.timeZone');
  });

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
});
