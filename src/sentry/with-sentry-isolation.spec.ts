import * as Sentry from '@sentry/nestjs';
import {
  captureBackgroundException,
  withSentryIsolation,
} from './with-sentry-isolation';

jest.mock('@sentry/nestjs', () => ({
  captureException: jest.fn(),
  withIsolationScope: jest.fn(
    <OperationOutcome>(callback: () => OperationOutcome): OperationOutcome =>
      callback(),
  ),
}));

describe('withSentryIsolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates work to Sentry.withIsolationScope', () => {
    const result = withSentryIsolation(() => 'isolated');

    expect(Sentry.withIsolationScope).toHaveBeenCalledTimes(1);
    expect(result).toBe('isolated');
  });

  it('captures a synchronous background error once and preserves the throw', () => {
    const backgroundError = new Error('synchronous failure');

    expect(() =>
      withSentryIsolation(() => {
        throw backgroundError;
      }),
    ).toThrow(backgroundError);
    expect(Sentry.captureException).toHaveBeenCalledWith(backgroundError);

    captureBackgroundException(backgroundError);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('captures an asynchronous background error and preserves the rejection', async () => {
    const backgroundError = new Error('asynchronous failure');

    await expect(
      withSentryIsolation(() => Promise.reject(backgroundError)),
    ).rejects.toBe(backgroundError);
    expect(Sentry.captureException).toHaveBeenCalledWith(backgroundError);
  });

  it('leaves synchronous HTTP event errors for their exception filter', () => {
    const eventError = new Error('event failure');

    expect(() =>
      withSentryIsolation(
        () => {
          throw eventError;
        },
        { captureErrors: false },
      ),
    ).toThrow(eventError);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('does not replace the task failure when Sentry capture throws', async () => {
    const backgroundError = new Error('task failure');
    jest.mocked(Sentry.captureException).mockImplementationOnce(() => {
      throw new Error('Sentry failure');
    });

    await expect(
      withSentryIsolation(() => Promise.reject(backgroundError)),
    ).rejects.toBe(backgroundError);
  });
});
