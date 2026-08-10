import * as Sentry from '@sentry/nestjs';

import { closeSentryTelemetry } from './sentry-shutdown';

describe('closeSentryTelemetry', () => {
  afterEach(async () => {
    await Sentry.close(1_000);
  });

  it('does not treat an uninitialized SDK as a shutdown timeout', async () => {
    const close = jest.fn<Promise<boolean>, [number]>();

    await expect(
      closeSentryTelemetry(2_000, {
        isInitialized: () => false,
        close,
      }),
    ).resolves.toBe('not-initialized');
    expect(close).not.toHaveBeenCalled();
  });

  it.each([
    [true, 'closed'],
    [false, 'timed-out'],
  ] as const)(
    'maps an initialized SDK close result of %s',
    async (didClose, result) => {
      const close = jest
        .fn<Promise<boolean>, [number]>()
        .mockResolvedValue(didClose);

      await expect(
        closeSentryTelemetry(2_000, {
          isInitialized: () => true,
          close,
        }),
      ).resolves.toBe(result);
      expect(close).toHaveBeenCalledWith(2_000);
    },
  );

  it('propagates SDK close errors to the shutdown coordinator', async () => {
    const closeError = new Error('transport close failed');

    await expect(
      closeSentryTelemetry(2_000, {
        isInitialized: () => true,
        close: () => Promise.reject(closeError),
      }),
    ).rejects.toBe(closeError);
  });

  it('flushes a pending envelope through the real SDK close path', async () => {
    let hasSentEnvelope = false;
    let hasFlushedTransport = false;
    Sentry.initWithoutDefaultIntegrations({
      dsn: 'https://public@example.invalid/1',
      transport: () => ({
        send() {
          hasSentEnvelope = true;
          return Promise.resolve({ statusCode: 200 });
        },
        flush() {
          hasFlushedTransport = true;
          return Promise.resolve(true);
        },
      }),
    });
    Sentry.captureMessage('shutdown telemetry regression');

    await expect(closeSentryTelemetry(1_000)).resolves.toBe('closed');
    expect(hasSentEnvelope).toBe(true);
    expect(hasFlushedTransport).toBe(true);
  });
});
