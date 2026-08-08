import { Logger } from '@nestjs/common';
import { firstValueFrom, toArray } from 'rxjs';
import {
  DEMO_SSE_MAX_EVENTS_PER_CONNECTION,
  DemoSseService,
} from './demo-sse.service';

describe('DemoSseService', () => {
  let service: DemoSseService;

  beforeEach(() => {
    service = new DemoSseService();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

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

  it('starts each activity-feed subscription with its own connection-local id', async () => {
    const [firstConnectionEvent, secondConnectionEvent] = await Promise.all([
      firstValueFrom(service.streamActivityFeed()),
      firstValueFrom(service.streamActivityFeed()),
    ]);

    expect(firstConnectionEvent.id).toBe('activity-0');
    expect(secondConnectionEvent.id).toBe('activity-0');
  });

  it('bounds every repeating stream and finalizes completed connections', async () => {
    jest.useFakeTimers();
    const debugLog = jest
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation(() => undefined);
    const repeatingStreams = [
      service.streamNotifications(10),
      service.streamActivityFeed(10),
      service.streamMetrics(10),
      service.streamHeartbeat(10),
    ];
    const completedStreams = repeatingStreams.map((stream) =>
      firstValueFrom(stream.pipe(toArray())),
    );

    await jest.advanceTimersByTimeAsync(
      DEMO_SSE_MAX_EVENTS_PER_CONNECTION * 10,
    );
    const eventGroups = await Promise.all(completedStreams);

    eventGroups.forEach((events) => {
      expect(events).toHaveLength(DEMO_SSE_MAX_EVENTS_PER_CONNECTION);
    });
    expect(debugLog).toHaveBeenCalledTimes(repeatingStreams.length);
  });

  it('finalizes a repeating stream when its subscriber disconnects', () => {
    const debugLog = jest
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation(() => undefined);
    const subscription = service.streamNotifications().subscribe();

    subscription.unsubscribe();

    expect(debugLog).toHaveBeenCalledWith(
      'notification SSE client disconnected',
    );
  });
});
