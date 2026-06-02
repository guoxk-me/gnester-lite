import { CommonScheduleService } from '../../common/schedule/schedule.service';
import {
  DEMO_DECLARATIVE_CRON_JOB,
  DEMO_DYNAMIC_CRON_JOB,
} from './demo-schedule.constants';
import { DemoScheduleService } from './demo-schedule.service';

describe('DemoScheduleService', () => {
  const scheduleService: jest.Mocked<
    Pick<CommonScheduleService, 'addCronJob' | 'getOverview' | 'isEnabled'>
  > = {
    addCronJob: jest.fn(),
    getOverview: jest.fn(),
    isEnabled: jest.fn(),
  };
  let service: DemoScheduleService;

  beforeEach(() => {
    jest.clearAllMocks();
    scheduleService.addCronJob.mockReturnValue(true);
    scheduleService.getOverview.mockReturnValue({
      enabled: false,
      timeZone: 'Asia/Shanghai',
      cronJobs: [],
      intervals: [],
      timeouts: [],
    });
    scheduleService.isEnabled.mockReturnValue(false);
    service = new DemoScheduleService(scheduleService as CommonScheduleService);
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
});
