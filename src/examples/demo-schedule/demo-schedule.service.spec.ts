import { CommonScheduleService } from '../../platform/runtime/schedule/schedule.service';
import {
  DEMO_DECLARATIVE_CRON_JOB,
  DEMO_DYNAMIC_CRON_JOB,
} from './demo-schedule.constants';
import { DemoScheduleService } from './demo-schedule.service';

describe('DemoScheduleService', () => {
  const scheduleService: jest.Mocked<
    Pick<
      CommonScheduleService,
      | 'addCronJob'
      | 'addInterval'
      | 'addTimeout'
      | 'deleteCronJob'
      | 'deleteInterval'
      | 'deleteTimeout'
      | 'getOverview'
      | 'isEnabled'
      | 'rescheduleCronJob'
      | 'startCronJob'
      | 'stopCronJob'
    >
  > = {
    addCronJob: jest.fn(),
    addInterval: jest.fn(),
    addTimeout: jest.fn(),
    deleteCronJob: jest.fn(),
    deleteInterval: jest.fn(),
    deleteTimeout: jest.fn(),
    getOverview: jest.fn(),
    isEnabled: jest.fn(),
    rescheduleCronJob: jest.fn(),
    startCronJob: jest.fn(),
    stopCronJob: jest.fn(),
  };
  let service: DemoScheduleService;

  beforeEach(() => {
    jest.clearAllMocks();
    scheduleService.addCronJob.mockReturnValue(true);
    scheduleService.addInterval.mockReturnValue(true);
    scheduleService.addTimeout.mockReturnValue(true);
    scheduleService.deleteCronJob.mockResolvedValue(true);
    scheduleService.deleteInterval.mockReturnValue(true);
    scheduleService.deleteTimeout.mockReturnValue(true);
    scheduleService.rescheduleCronJob.mockReturnValue(true);
    scheduleService.startCronJob.mockReturnValue(true);
    scheduleService.stopCronJob.mockResolvedValue(true);
    scheduleService.getOverview.mockReturnValue({
      enabled: false,
      timeZone: 'Asia/Shanghai',
      cronJobs: [],
      intervals: [],
      timeouts: [],
    });
    scheduleService.isEnabled.mockReturnValue(false);
    service = new DemoScheduleService(
      scheduleService as unknown as CommonScheduleService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not run scheduled work when the schedule switch is disabled', () => {
    expect(service.handleDeclarativeCron()).toBeUndefined();
    expect(scheduleService.isEnabled).toHaveBeenCalled();
  });

  it('uses named task results for declarative and dynamic cron examples', () => {
    scheduleService.isEnabled.mockReturnValue(true);
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2026-06-01T01:00:00.000Z').getTime());

    expect(service.handleDeclarativeCron()).toEqual({
      task: DEMO_DECLARATIVE_CRON_JOB,
      ranAt: '2026-06-01T01:00:00.000Z',
    });
    expect(service.handleDynamicCron()).toEqual({
      task: DEMO_DYNAMIC_CRON_JOB,
      ranAt: '2026-06-01T01:00:00.000Z',
    });
    expect(service.handleCronPattern()).toEqual({
      task: 'demo-schedule:cron-pattern',
      ranAt: '2026-06-01T01:00:00.000Z',
    });
    expect(service.handleOneTimeCron()).toEqual({
      task: 'demo-schedule:one-time-cron',
      ranAt: '2026-06-01T01:00:00.000Z',
    });
    expect(service.handleTimeZoneCron()).toEqual({
      task: 'demo-schedule:time-zone-cron',
      ranAt: '2026-06-01T01:00:00.000Z',
    });
    expect(service.handleUtcOffsetCron()).toEqual({
      task: 'demo-schedule:utc-offset-cron',
      ranAt: '2026-06-01T01:00:00.000Z',
    });
  });

  it('returns scheduler state for operational inspection', () => {
    expect(service.getOverview()).toEqual({
      enabled: false,
      timeZone: 'Asia/Shanghai',
      cronJobs: [],
      intervals: [],
      timeouts: [],
    });
    expect(scheduleService.getOverview).toHaveBeenCalled();
  });

  it('registers the dynamic cron job through the common schedule service', () => {
    service.registerDynamicCronJob();

    const options = scheduleService.addCronJob.mock.calls[0][0];
    expect(options.name).toBe(DEMO_DYNAMIC_CRON_JOB);
    expect(options.cronTime).toBe('0 0 * * *');
    expect(typeof options.onTick).toBe('function');
  });

  it('demonstrates dynamic cron lifecycle operations', async () => {
    expect(service.startDynamicCronJob()).toBe(true);
    expect(await service.stopDynamicCronJob()).toBe(true);
    expect(service.rescheduleDynamicCronJob()).toBe(true);
    expect(await service.deleteDynamicCronJob()).toBe(true);

    expect(scheduleService.startCronJob).toHaveBeenCalledWith(
      DEMO_DYNAMIC_CRON_JOB,
    );
    expect(scheduleService.stopCronJob).toHaveBeenCalledWith(
      DEMO_DYNAMIC_CRON_JOB,
    );
    expect(scheduleService.rescheduleCronJob).toHaveBeenCalledWith(
      DEMO_DYNAMIC_CRON_JOB,
      '15 * * * * *',
    );
    expect(scheduleService.deleteCronJob).toHaveBeenCalledWith(
      DEMO_DYNAMIC_CRON_JOB,
    );
  });

  it('registers dynamic interval and timeout examples through the common service', () => {
    service.registerDynamicInterval();
    service.registerDynamicTimeout();

    const [intervalOptions] = scheduleService.addInterval.mock.calls[0];
    const [timeoutOptions] = scheduleService.addTimeout.mock.calls[0];
    expect(intervalOptions.name).toBe('demo-schedule:dynamic-interval');
    expect(intervalOptions.milliseconds).toBe(60_000);
    expect(typeof intervalOptions.onTick).toBe('function');
    expect(timeoutOptions.name).toBe('demo-schedule:dynamic-timeout');
    expect(timeoutOptions.milliseconds).toBe(5_000);
    expect(typeof timeoutOptions.onTick).toBe('function');
  });

  it('deletes dynamic interval and timeout examples through the common service', () => {
    expect(service.deleteDynamicInterval()).toBe(true);
    expect(service.deleteDynamicTimeout()).toBe(true);

    expect(scheduleService.deleteInterval).toHaveBeenCalledWith(
      'demo-schedule:dynamic-interval',
    );
    expect(scheduleService.deleteTimeout).toHaveBeenCalledWith(
      'demo-schedule:dynamic-timeout',
    );
  });
});
