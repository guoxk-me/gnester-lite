import * as Sentry from '@sentry/nestjs';

export interface SentryIsolationOptions {
  readonly captureErrors?: boolean;
}

const capturedBackgroundErrors = new WeakSet<Error>();

function captureExceptionOnce(error: unknown): void {
  if (error instanceof Error) {
    if (capturedBackgroundErrors.has(error)) {
      return;
    }
    capturedBackgroundErrors.add(error);
  }

  try {
    Sentry.captureException(error);
  } catch {
    // AI modified: observability failures must not replace the background task failure.
  }
}

export function captureBackgroundException(error: unknown): void {
  Sentry.withIsolationScope(() => captureExceptionOnce(error));
}

export function withSentryIsolation<OperationOutcome>(
  callback: () => Promise<OperationOutcome>,
  options?: SentryIsolationOptions,
): Promise<OperationOutcome>;
export function withSentryIsolation<OperationOutcome>(
  callback: () => OperationOutcome,
  options?: SentryIsolationOptions,
): OperationOutcome;
// AI modified: isolated background failures are captured once while preserving their original control flow.
export function withSentryIsolation<OperationOutcome>(
  callback: () => OperationOutcome | Promise<OperationOutcome>,
  options: SentryIsolationOptions = {},
): OperationOutcome | Promise<OperationOutcome> {
  return Sentry.withIsolationScope(() => {
    try {
      const operation = callback();

      if (operation instanceof Promise) {
        return operation.catch((error: unknown) => {
          if (options.captureErrors !== false) {
            captureExceptionOnce(error);
          }
          throw error;
        });
      }

      return operation;
    } catch (error) {
      if (options.captureErrors !== false) {
        captureExceptionOnce(error);
      }
      throw error;
    }
  });
}
