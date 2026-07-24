// CN: 测试文件，验证 demo-sentry 的行为契约；EN: Test file verifies behavior contracts for demo-sentry.
import { ConfigService } from '@nestjs/config';
import { Environment } from 'config/config.types';
import { DemoSentryService } from './demo-sentry.service';

describe('DemoSentryService', () => {
  it('reports disabled status when DSN is empty', () => {
    const service = new DemoSentryService(
      createConfigService({
        NODE_ENV: Environment.Development,
        SENTRY_DSN: '',
        SENTRY_ENABLED: true,
      }),
    );

    expect(service.getStatus()).toEqual({
      enabled: false,
      hasDsn: false,
      environment: Environment.Development,
      tracesSampleRate: null,
      notes: [
        'Sentry.init runs in src/instrument.ts before Nest bootstraps.',
        'Empty SENTRY_DSN keeps the template runnable without a Sentry project.',
        'HttpException responses are not captured by default; unexpected errors are.',
        'Use withSentryIsolation() around cron, queue, and event handlers.',
      ],
    });
  });

  it('reports enabled status when DSN is configured', () => {
    const service = new DemoSentryService(
      createConfigService({
        NODE_ENV: Environment.Development,
        SENTRY_DSN: 'https://examplePublicKey@o0.ingest.sentry.io/0',
        SENTRY_ENABLED: true,
        SENTRY_TRACES_SAMPLE_RATE: 0.25,
      }),
    );

    expect(service.getStatus()).toMatchObject({
      enabled: true,
      hasDsn: true,
      environment: Environment.Development,
      tracesSampleRate: 0.25,
    });
  });

  it('throws a deliberate error for the debug endpoint', () => {
    const service = new DemoSentryService(createConfigService({}));

    expect(() => service.triggerDebugError()).toThrow('My first Sentry error!');
  });
});

function createConfigService(
  values: Record<string, string | number | boolean>,
): ConfigService {
  return {
    get: <T>(key: string, defaultValue?: T): T => {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        return values[key] as T;
      }

      return defaultValue as T;
    },
  } as ConfigService;
}
