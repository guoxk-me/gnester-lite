// CN: 测试文件，验证 demo-schedule 的行为契约；EN: Test file verifies behavior contracts for demo-schedule.
import { DemoScheduleController } from './demo-schedule.controller';
import { DemoScheduleService } from './demo-schedule.service';

// CN: 测试分组：DemoScheduleController；EN: Test group: DemoScheduleController.
describe('DemoScheduleController', () => {
  const demoScheduleService: jest.Mocked<
    Pick<
      DemoScheduleService,
      | 'getOverview'
      | 'handleDeclarativeCron'
      | 'handleDynamicCron'
      | 'handleInterval'
      | 'handleTimeout'
      | 'deleteDynamicCronJob'
      | 'deleteDynamicInterval'
      | 'deleteDynamicTimeout'
      | 'registerDynamicInterval'
      | 'registerDynamicCronJob'
      | 'registerDynamicTimeout'
      | 'rescheduleDynamicCronJob'
      | 'startDynamicCronJob'
      | 'stopDynamicCronJob'
    >
  > = {
    getOverview: jest.fn(),
    handleDeclarativeCron: jest.fn(),
    handleDynamicCron: jest.fn(),
    handleInterval: jest.fn(),
    handleTimeout: jest.fn(),
    deleteDynamicCronJob: jest.fn(),
    deleteDynamicInterval: jest.fn(),
    deleteDynamicTimeout: jest.fn(),
    registerDynamicInterval: jest.fn(),
    registerDynamicCronJob: jest.fn(),
    registerDynamicTimeout: jest.fn(),
    rescheduleDynamicCronJob: jest.fn(),
    startDynamicCronJob: jest.fn(),
    stopDynamicCronJob: jest.fn(),
  };
  let controller: DemoScheduleController;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DemoScheduleController(
      demoScheduleService as DemoScheduleService,
    );
  });

  // CN: 测试用例：delegates scheduler inspection to the service；EN: Test case: delegates scheduler inspection to the service.
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

  // CN: 测试用例：exposes manual execution examples for every demo scheduler style；EN: Test case: exposes manual execution examples for every demo scheduler style.
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

  // CN: 测试用例：exposes the dynamic cron registration example；EN: Test case: exposes the dynamic cron registration example.
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

  // CN: 测试用例：exposes dynamic cron lifecycle examples；EN: Test case: exposes dynamic cron lifecycle examples.
  it('exposes dynamic cron lifecycle examples', async () => {
    demoScheduleService.startDynamicCronJob.mockReturnValue(true);
    demoScheduleService.stopDynamicCronJob.mockResolvedValue(true);
    demoScheduleService.rescheduleDynamicCronJob.mockReturnValue(true);
    demoScheduleService.deleteDynamicCronJob.mockResolvedValue(true);

    expect(controller.startDynamicCronJob()).toEqual({
      name: 'demo-schedule:dynamic-cron',
      type: 'cron',
      action: 'start',
      applied: true,
    });
    expect(await controller.stopDynamicCronJob()).toEqual({
      name: 'demo-schedule:dynamic-cron',
      type: 'cron',
      action: 'stop',
      applied: true,
    });
    expect(controller.rescheduleDynamicCronJob()).toEqual({
      name: 'demo-schedule:dynamic-cron',
      type: 'cron',
      action: 'reschedule',
      applied: true,
    });
    expect(await controller.deleteDynamicCronJob()).toEqual({
      name: 'demo-schedule:dynamic-cron',
      type: 'cron',
      action: 'delete',
      applied: true,
    });
  });

  // CN: 测试用例：exposes dynamic interval and timeout registration and deletion examples；EN: Test case: exposes dynamic interval and timeout registration and deletion examples.
  it('exposes dynamic interval and timeout registration and deletion examples', () => {
    demoScheduleService.registerDynamicInterval.mockReturnValue(true);
    demoScheduleService.registerDynamicTimeout.mockReturnValue(true);
    demoScheduleService.deleteDynamicInterval.mockReturnValue(true);
    demoScheduleService.deleteDynamicTimeout.mockReturnValue(true);

    expect(controller.registerDynamicInterval()).toEqual({
      name: 'demo-schedule:dynamic-interval',
      type: 'interval',
      action: 'register',
      applied: true,
    });
    expect(controller.registerDynamicTimeout()).toEqual({
      name: 'demo-schedule:dynamic-timeout',
      type: 'timeout',
      action: 'register',
      applied: true,
    });
    expect(controller.deleteDynamicInterval()).toEqual({
      name: 'demo-schedule:dynamic-interval',
      type: 'interval',
      action: 'delete',
      applied: true,
    });
    expect(controller.deleteDynamicTimeout()).toEqual({
      name: 'demo-schedule:dynamic-timeout',
      type: 'timeout',
      action: 'delete',
      applied: true,
    });
  });
});
