// CN: 测试文件，验证 demo-sse 的行为契约；EN: Test file verifies behavior contracts for demo-sse.
import { firstValueFrom, toArray } from 'rxjs';
import { DemoSseService } from './demo-sse.service';

// CN: 测试分组：DemoSseService；EN: Test group: DemoSseService.
describe('DemoSseService', () => {
  let service: DemoSseService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    service = new DemoSseService();
  });

  // CN: 测试用例：lists the common SSE application scenarios exposed by the demo module；EN: Test case: lists the common SSE application scenarios exposed by the demo module.
  it('lists the common SSE application scenarios exposed by the demo module', () => {
    const scenarios = service.listScenarios();

    expect(scenarios).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          route: 'GET /demo-sse/notifications',
          eventType: 'notification',
        }),
        expect.objectContaining({
          route: 'GET /demo-sse/job-progress',
          eventType: 'job.progress',
        }),
        expect.objectContaining({
          route: 'GET /demo-sse/activity-feed',
          eventType: 'activity',
        }),
        expect.objectContaining({
          route: 'GET /demo-sse/metrics',
          eventType: 'metric.snapshot',
        }),
        expect.objectContaining({
          route: 'GET /demo-sse/heartbeat',
          eventType: 'heartbeat',
        }),
      ]),
    );
  });

  // CN: 测试用例：emits browser-consumable notification events with SSE metadata；EN: Test case: emits browser-consumable notification events with SSE metadata.
  it('emits browser-consumable notification events with SSE metadata', async () => {
    const event = await firstValueFrom(service.streamNotifications());
    const data = event.data as { sequence: number; severity: string };

    expect(event).toMatchObject({
      id: 'notification-0',
      type: 'notification',
      retry: 5000,
    });
    expect(data.sequence).toBe(0);
    expect(data.severity).toBe('info');
  });

  // CN: 测试用例：completes the job progress stream after the completed event；EN: Test case: completes the job progress stream after the completed event.
  it('completes the job progress stream after the completed event', async () => {
    const events = await firstValueFrom(
      service.streamJobProgress(1).pipe(toArray()),
    );
    const completedEvent = events.find((event) => {
      const data = event.data as { progress: number };

      return data.progress === 100;
    });
    const completedData = completedEvent?.data as
      | { progress: number; status: string }
      | undefined;

    expect(completedEvent?.type).toBe('job.progress');
    expect(completedData?.progress).toBe(100);
    expect(completedData?.status).toBe('completed');
  });
});
