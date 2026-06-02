import { DemoScheduleController } from './demo-schedule.controller';
import { DemoScheduleService } from './demo-schedule.service';

describe('DemoScheduleController', () => {
  const demoScheduleService: jest.Mocked<
    Pick<
      DemoScheduleService,
      | 'getOverview'
      | 'handleDeclarativeCron'
      | 'handleDynamicCron'
      | 'handleInterval'
      | 'handleTimeout'
      | 'registerDynamicCronJob'
    >
  > = {
    getOverview: jest.fn(),
    handleDeclarativeCron: jest.fn(),
    handleDynamicCron: jest.fn(),
    handleInterval: jest.fn(),
    handleTimeout: jest.fn(),
    registerDynamicCronJob: jest.fn(),
  };
  let controller: DemoScheduleController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DemoScheduleController(
      demoScheduleService as DemoScheduleService,
    );
  });

  it('delegates scheduler inspection to the service', () => {
    const overview = {
      enabled: false,
      timeZone: 'Asia/Shanghai',
      cronJobs: [],
      intervals: [],
      timeouts: [],
    };
    demoScheduleService.getOverview.mockReturnValue(overview);

    expect(controller.getOverview()).toBe(overview);
  });

  it('exposes manual execution examples for every demo scheduler style', () => {
    const declarativeCronRun = {
      task: 'demo-schedule:declarative-cron',
      ranAt: '2026-06-01T01:00:00.000Z',
    };
    const dynamicCronRun = {
      task: 'demo-schedule:dynamic-cron',
      ranAt: '2026-06-01T01:01:00.000Z',
    };
    const intervalRun = {
      task: 'demo-schedule:interval',
      ranAt: '2026-06-01T01:02:00.000Z',
    };
    const timeoutRun = {
      task: 'demo-schedule:timeout',
      ranAt: '2026-06-01T01:03:00.000Z',
    };
    demoScheduleService.handleDeclarativeCron.mockReturnValue(
      declarativeCronRun,
    );
    demoScheduleService.handleDynamicCron.mockReturnValue(dynamicCronRun);
    demoScheduleService.handleInterval.mockReturnValue(intervalRun);
    demoScheduleService.handleTimeout.mockReturnValue(timeoutRun);

    expect(controller.runDeclarativeCron()).toBe(declarativeCronRun);
    expect(controller.runDynamicCron()).toBe(dynamicCronRun);
    expect(controller.runInterval()).toBe(intervalRun);
    expect(controller.runTimeout()).toBe(timeoutRun);
  });

  it('exposes the dynamic cron registration example', () => {
    const overview = {
      enabled: true,
      timeZone: 'Asia/Shanghai',
      cronJobs: [],
      intervals: [],
      timeouts: [],
    };
    demoScheduleService.getOverview.mockReturnValue(overview);

    expect(controller.registerDynamicCronJob()).toBe(overview);
    expect(demoScheduleService.registerDynamicCronJob).toHaveBeenCalled();
  });
});
