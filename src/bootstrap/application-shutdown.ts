export interface ApplicationShutdownBudgets {
  readonly readinessPropagationDelayMs: number;
  readonly applicationCloseTimeoutMs: number;
  readonly telemetryCloseTimeoutMs: number;
}

export const DEFAULT_APPLICATION_SHUTDOWN_BUDGETS: ApplicationShutdownBudgets =
  {
    readinessPropagationDelayMs: 5_000,
    applicationCloseTimeoutMs: 10_000,
    telemetryCloseTimeoutMs: 2_000,
  };

export type ApplicationShutdownActionResult = 'completed' | 'timed-out';
export type ApplicationShutdownPhase =
  | 'readiness'
  | 'admission'
  | 'application'
  | 'telemetry';
export type ApplicationTelemetryCloseResult =
  | 'closed'
  | 'not-initialized'
  | 'timed-out';
export type ApplicationTerminationSignal = 'SIGINT' | 'SIGTERM';

interface ApplicationCloseTarget {
  close(signal?: string): Promise<void>;
}

interface ApplicationProcessTarget {
  exit(exitCode: number): never;
  once(signal: ApplicationTerminationSignal, listener: () => void): unknown;
}

export interface HttpServerCloseTarget {
  readonly listening: boolean;
  close(callback: (error?: Error) => void): unknown;
}

export interface ApplicationShutdownOptions {
  readonly getApplication: () => ApplicationCloseTarget | undefined;
  readonly getBudgets?: () => ApplicationShutdownBudgets;
  readonly isAcceptingRequests: () => boolean;
  readonly beginDrain: (reason: string) => void;
  readonly stopAcceptingRequests: () => Promise<void>;
  readonly closeTelemetry: (
    timeoutMs: number,
  ) => Promise<ApplicationTelemetryCloseResult>;
  readonly onShutdownError: (
    error: unknown,
    reason: string,
    phase: ApplicationShutdownPhase,
  ) => void;
  readonly onShutdownTimeout: (
    reason: string,
    phase: ApplicationShutdownPhase,
  ) => void;
  readonly processTarget: ApplicationProcessTarget;
}

export interface ApplicationShutdownController {
  shutdownApplication(
    exitCode: number,
    reason: string,
    signal?: ApplicationTerminationSignal,
  ): Promise<never>;
}

export function reportStartupFailureAndShutdown(
  reportFailure: () => void,
  shutdownApplication: () => Promise<never>,
): Promise<never> {
  try {
    reportFailure();
  } catch {
    // AI modified: logging failure cannot prevent the mandatory startup-failure exit path.
  }

  return shutdownApplication();
}

export async function runShutdownActionWithinDeadline(
  shutdownAction: () => Promise<void>,
  timeoutMs: number,
): Promise<ApplicationShutdownActionResult> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutResult = new Promise<ApplicationShutdownActionResult>(
    (resolve) => {
      timeout = setTimeout(
        () => {
          resolve('timed-out');
        },
        Math.max(0, timeoutMs),
      );
    },
  );

  try {
    const actionResult = Promise.resolve()
      .then(shutdownAction)
      .then<ApplicationShutdownActionResult>(() => 'completed');

    // AI modified: every shutdown phase remains bounded even when a close hook never settles.
    return await Promise.race([actionResult, timeoutResult]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export function stopAcceptingHttpRequests(
  httpServer: HttpServerCloseTarget,
): Promise<void> {
  if (!httpServer.listening) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    // AI modified: wait for in-flight HTTP work before Nest destroys its providers.
    httpServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export function getSignalExitCode(
  signal: ApplicationTerminationSignal,
): number {
  return signal === 'SIGINT' ? 130 : 143;
}

export function registerApplicationShutdownHandlers(
  options: ApplicationShutdownOptions,
): ApplicationShutdownController {
  let shutdown: Promise<never> | undefined;

  const safelyReportError = (
    error: unknown,
    reason: string,
    phase: ApplicationShutdownPhase,
  ): void => {
    try {
      options.onShutdownError(error, reason, phase);
    } catch {
      // AI modified: reporting failures cannot interrupt later cleanup phases.
    }
  };

  const safelyReportTimeout = (
    reason: string,
    phase: ApplicationShutdownPhase,
  ): void => {
    try {
      options.onShutdownTimeout(reason, phase);
    } catch {
      // AI modified: timeout reporting cannot interrupt later cleanup phases.
    }
  };

  const runPhase = async (
    phase: ApplicationShutdownPhase,
    reason: string,
    deadline: number,
    shutdownAction: () => Promise<void>,
  ): Promise<ApplicationShutdownActionResult> => {
    try {
      const actionResult = await runShutdownActionWithinDeadline(
        shutdownAction,
        deadline - Date.now(),
      );

      if (actionResult === 'timed-out') {
        safelyReportTimeout(reason, phase);
      }

      return actionResult;
    } catch (error) {
      safelyReportError(error, reason, phase);
      return 'completed';
    }
  };

  const closeAndExit = async (
    exitCode: number,
    reason: string,
    signal?: ApplicationTerminationSignal,
  ): Promise<never> => {
    const shutdownStartedAt = Date.now();

    try {
      let budgets = DEFAULT_APPLICATION_SHUTDOWN_BUDGETS;
      let application: ApplicationCloseTarget | undefined;
      let isAcceptingRequests = false;

      try {
        budgets = options.getBudgets?.() ?? budgets;
      } catch (error) {
        safelyReportError(error, reason, 'application');
      }

      try {
        application = options.getApplication();
      } catch (error) {
        safelyReportError(error, reason, 'application');
      }

      try {
        isAcceptingRequests = options.isAcceptingRequests();
      } catch (error) {
        safelyReportError(error, reason, 'readiness');
      }

      // AI modified: partial startup failures skip the propagation delay when no HTTP listener exists.
      const propagationDeadline =
        shutdownStartedAt +
        (isAcceptingRequests ? budgets.readinessPropagationDelayMs : 0);
      const applicationDeadline =
        propagationDeadline + budgets.applicationCloseTimeoutMs;
      const telemetryDeadline =
        applicationDeadline + budgets.telemetryCloseTimeoutMs;

      if (isAcceptingRequests) {
        try {
          // AI modified: readiness changes synchronously so orchestrators can remove this instance before admission closes.
          options.beginDrain(reason);
        } catch (error) {
          safelyReportError(error, reason, 'readiness');
        }

        await waitUntil(propagationDeadline);

        await runPhase(
          'admission',
          reason,
          applicationDeadline,
          options.stopAcceptingRequests,
        );
      }

      if (application) {
        await runPhase('application', reason, applicationDeadline, () =>
          application.close(signal),
        );
      }

      const telemetryPhaseDeadline = Math.min(
        telemetryDeadline,
        Date.now() + budgets.telemetryCloseTimeoutMs,
      );
      let telemetryCloseResult: ApplicationTelemetryCloseResult | undefined;
      const telemetryActionResult = await runPhase(
        'telemetry',
        reason,
        telemetryPhaseDeadline,
        async () => {
          telemetryCloseResult = await options.closeTelemetry(
            Math.max(0, telemetryPhaseDeadline - Date.now()),
          );
        },
      );

      if (
        telemetryActionResult === 'completed' &&
        telemetryCloseResult === 'timed-out'
      ) {
        safelyReportTimeout(reason, 'telemetry');
      }
    } finally {
      // AI modified: the original exit contract remains authoritative after every bounded cleanup phase.
      options.processTarget.exit(exitCode);
    }
  };

  const shutdownApplication = (
    exitCode: number,
    reason: string,
    signal?: ApplicationTerminationSignal,
  ): Promise<never> => {
    // AI modified: the first shutdown trigger owns the signal, exit code, and all cleanup phases.
    shutdown ??= closeAndExit(exitCode, reason, signal);

    return shutdown;
  };

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    options.processTarget.once(signal, () => {
      void shutdownApplication(getSignalExitCode(signal), signal, signal);
    });
  }

  return { shutdownApplication };
}

function waitUntil(deadline: number): Promise<void> {
  const remainingMs = deadline - Date.now();

  if (remainingMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, remainingMs);
  });
}
