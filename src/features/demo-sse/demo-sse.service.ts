// CN: 服务，承载 demo-sse 的业务逻辑；EN: Service holds business logic for demo-sse.
import { Injectable, Logger } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { finalize, map, Observable, takeWhile, timer } from 'rxjs';
import { DemoSseScenarioDto } from './dto/demo-sse-scenario.dto';

const DEFAULT_RETRY_MS = 5_000;

@Injectable()
export class DemoSseService {
  private readonly logger = new Logger(DemoSseService.name);

  // CN: 执行 demo-sse 的 list scenarios 业务逻辑；EN: Runs the list scenarios business logic for demo-sse.
  listScenarios(): DemoSseScenarioDto[] {
    return [
      new DemoSseScenarioDto({
        name: 'Live notifications',
        route: 'GET /demo-sse/notifications',
        eventType: 'notification',
        useCase: 'send user-visible notifications without polling',
        demonstrates: 'long-lived EventSource stream with named events',
      }),
      new DemoSseScenarioDto({
        name: 'Background job progress',
        route: 'GET /demo-sse/job-progress',
        eventType: 'job.progress',
        useCase: 'report import, export, email, or queue job progress',
        demonstrates: 'finite stream that completes when the job is done',
      }),
      new DemoSseScenarioDto({
        name: 'Activity feed',
        route: 'GET /demo-sse/activity-feed',
        eventType: 'activity',
        useCase: 'append audit, timeline, or collaboration events in real time',
        demonstrates: 'append-only event feed with stable event ids',
      }),
      new DemoSseScenarioDto({
        name: 'Dashboard metrics',
        route: 'GET /demo-sse/metrics',
        eventType: 'metric.snapshot',
        useCase: 'refresh operational counters and charts as data changes',
        demonstrates: 'periodic snapshots for dashboards',
      }),
      new DemoSseScenarioDto({
        name: 'Heartbeat',
        route: 'GET /demo-sse/heartbeat',
        eventType: 'heartbeat',
        useCase: 'keep proxies and clients aware that the stream is alive',
        demonstrates: 'lightweight keep-alive messages',
      }),
    ];
  }

  // CN: 执行 demo-sse 的 stream notifications 业务逻辑；EN: Runs the stream notifications business logic for demo-sse.
  streamNotifications(intervalMs = 2_000): Observable<MessageEvent> {
    const templates = [
      'Profile sync finished',
      'New comment requires review',
      'Billing export is ready',
    ];

    return timer(0, intervalMs).pipe(
      map((sequence) => ({
        id: `notification-${sequence}`,
        type: 'notification',
        retry: DEFAULT_RETRY_MS,
        data: {
          sequence,
          title: templates[sequence % templates.length],
          severity: sequence % 3 === 1 ? 'warning' : 'info',
          createdAt: new Date().toISOString(),
        },
      })),
      finalize(() => this.logger.debug('notification SSE client disconnected')),
    );
  }

  // CN: 执行 demo-sse 的 stream job progress 业务逻辑；EN: Runs the stream job progress business logic for demo-sse.
  streamJobProgress(intervalMs = 1_000): Observable<MessageEvent> {
    return timer(0, intervalMs).pipe(
      map((sequence) => {
        const progress = Math.min(sequence * 20, 100);

        return {
          id: `job-progress-${sequence}`,
          type: 'job.progress',
          retry: DEFAULT_RETRY_MS,
          data: {
            jobId: 'demo-import-001',
            progress,
            status: progress === 100 ? 'completed' : 'running',
            updatedAt: new Date().toISOString(),
          },
        };
      }),
      takeWhile((event) => event.data.progress < 100, true),
      finalize(() => this.logger.debug('job progress SSE stream closed')),
    );
  }

  // CN: 执行 demo-sse 的 stream activity feed 业务逻辑；EN: Runs the stream activity feed business logic for demo-sse.
  streamActivityFeed(intervalMs = 1_500): Observable<MessageEvent> {
    const actions = ['user.created', 'invoice.approved', 'cache.invalidated'];

    return timer(0, intervalMs).pipe(
      map((sequence) => ({
        id: `activity-${sequence}`,
        type: 'activity',
        retry: DEFAULT_RETRY_MS,
        data: {
          actor: `demo-user-${(sequence % 3) + 1}`,
          action: actions[sequence % actions.length],
          resourceId: `resource-${sequence + 100}`,
          occurredAt: new Date().toISOString(),
        },
      })),
      finalize(() => this.logger.debug('activity SSE client disconnected')),
    );
  }

  // CN: 执行 demo-sse 的 stream metrics 业务逻辑；EN: Runs the stream metrics business logic for demo-sse.
  streamMetrics(intervalMs = 2_000): Observable<MessageEvent> {
    return timer(0, intervalMs).pipe(
      map((sequence) => ({
        id: `metric-${sequence}`,
        type: 'metric.snapshot',
        retry: DEFAULT_RETRY_MS,
        data: {
          activeUsers: 42 + (sequence % 5),
          queueDepth: Math.max(0, 12 - sequence),
          cacheHitRate: Number((0.86 + (sequence % 4) * 0.01).toFixed(2)),
          sampledAt: new Date().toISOString(),
        },
      })),
      finalize(() => this.logger.debug('metrics SSE client disconnected')),
    );
  }

  // CN: 执行 demo-sse 的 stream heartbeat 业务逻辑；EN: Runs the stream heartbeat business logic for demo-sse.
  streamHeartbeat(intervalMs = 15_000): Observable<MessageEvent> {
    return timer(0, intervalMs).pipe(
      map((sequence) => ({
        id: `heartbeat-${sequence}`,
        type: 'heartbeat',
        retry: DEFAULT_RETRY_MS,
        data: {
          ok: true,
          sequence,
          timestamp: new Date().toISOString(),
        },
      })),
      finalize(() => this.logger.debug('heartbeat SSE client disconnected')),
    );
  }
}
