import { once } from 'node:events';
import { createServer } from 'node:http';

import {
  getSignalExitCode,
  registerApplicationShutdownHandlers,
  reportStartupFailureAndShutdown,
  runShutdownActionWithinDeadline,
  stopAcceptingHttpRequests,
  type ApplicationShutdownBudgets,
  type ApplicationShutdownOptions,
} from './application-shutdown';

const immediateBudgets: ApplicationShutdownBudgets = {
  readinessPropagationDelayMs: 0,
  applicationCloseTimeoutMs: 100,
  telemetryCloseTimeoutMs: 50,
};

function shutdownOptions(
  overrides: Partial<ApplicationShutdownOptions> = {},
): ApplicationShutdownOptions {
  return {
    getApplication: () => ({ close: () => Promise.resolve() }),
    getBudgets: () => immediateBudgets,
    isAcceptingRequests: () => true,
    beginDrain: jest.fn(),
    stopAcceptingRequests: () => Promise.resolve(),
    closeTelemetry: () => Promise.resolve('closed'),
    onShutdownError: jest.fn(),
    onShutdownTimeout: jest.fn(),
    processTarget: {
      exit: (exitCode: number): never => {
        throw new Error(`exit:${exitCode}`);
      },
      once: jest.fn(),
    },
    ...overrides,
  };
}

describe('application shutdown', () => {
  it('reports a completed bounded shutdown action', async () => {
    const shutdownAction = jest.fn().mockResolvedValue(undefined);

    await expect(
      runShutdownActionWithinDeadline(shutdownAction, 100),
    ).resolves.toBe('completed');
    expect(shutdownAction).toHaveBeenCalledTimes(1);
  });

  it('returns at the deadline when a shutdown action never settles', async () => {
    jest.useFakeTimers();

    try {
      const shutdownAction = jest.fn(() => new Promise<void>(() => undefined));
      const shutdownResult = runShutdownActionWithinDeadline(
        shutdownAction,
        100,
      );
      await jest.advanceTimersByTimeAsync(100);

      await expect(shutdownResult).resolves.toBe('timed-out');
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not close an HTTP server that never started listening', async () => {
    const close = jest.fn();

    await expect(
      stopAcceptingHttpRequests({ listening: false, close }),
    ).resolves.toBeUndefined();
    expect(close).not.toHaveBeenCalled();
  });

  it('waits for the HTTP server close callback', async () => {
    let completeClose: ((error?: Error) => void) | undefined;
    const close = jest.fn((callback: (error?: Error) => void) => {
      completeClose = callback;
    });
    const closeResult = stopAcceptingHttpRequests({
      listening: true,
      close,
    });

    expect(close).toHaveBeenCalledTimes(1);
    completeClose?.();

    await expect(closeResult).resolves.toBeUndefined();
  });

  it('keeps application providers alive until an active HTTP response finishes', async () => {
    let markRequestStarted!: () => void;
    let releaseResponse!: () => void;
    const requestStarted = new Promise<void>((resolve) => {
      markRequestStarted = resolve;
    });
    const responseRelease = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    const httpServer = createServer((_request, response) => {
      markRequestStarted();
      void responseRelease.then(() => {
        response.end('drained');
      });
    });
    httpServer.listen(0, '127.0.0.1');
    await once(httpServer, 'listening');

    try {
      const address = httpServer.address();

      if (!address || typeof address === 'string') {
        throw new Error('Expected a loopback HTTP server address.');
      }

      const activeResponse = fetch(`http://127.0.0.1:${address.port}/work`);
      await requestStarted;

      const applicationClose = jest.fn().mockResolvedValue(undefined);
      const shutdown = registerApplicationShutdownHandlers(
        shutdownOptions({
          getApplication: () => ({ close: applicationClose }),
          stopAcceptingRequests: () => stopAcceptingHttpRequests(httpServer),
        }),
      );
      const shutdownResult = shutdown.shutdownApplication(
        143,
        'SIGTERM',
        'SIGTERM',
      );
      const shutdownExpectation =
        expect(shutdownResult).rejects.toThrow('exit:143');

      for (
        let attempt = 0;
        attempt < 10 && httpServer.listening;
        attempt += 1
      ) {
        await Promise.resolve();
      }

      expect(httpServer.listening).toBe(false);
      expect(applicationClose).not.toHaveBeenCalled();

      releaseResponse();
      await expect(
        activeResponse.then((response) => response.text()),
      ).resolves.toBe('drained');
      await shutdownExpectation;
      expect(applicationClose).toHaveBeenCalledWith('SIGTERM');
    } finally {
      httpServer.closeAllConnections();

      if (httpServer.listening) {
        await new Promise<void>((resolve, reject) => {
          httpServer.close((error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        });
      }
    }
  });

  it('runs readiness, admission, application, telemetry, and exit in order', async () => {
    const phases: string[] = [];
    const shutdown = registerApplicationShutdownHandlers(
      shutdownOptions({
        getApplication: () => ({
          close: () => {
            phases.push('application');
            return Promise.resolve();
          },
        }),
        beginDrain: () => {
          phases.push('readiness');
        },
        stopAcceptingRequests: () => {
          phases.push('admission');
          return Promise.resolve();
        },
        closeTelemetry: () => {
          phases.push('telemetry');
          return Promise.resolve('closed');
        },
        processTarget: {
          exit: (exitCode: number): never => {
            phases.push(`exit:${exitCode}`);
            throw new Error(`exit:${exitCode}`);
          },
          once: jest.fn(),
        },
      }),
    );

    await expect(
      shutdown.shutdownApplication(143, 'SIGTERM', 'SIGTERM'),
    ).rejects.toThrow('exit:143');
    expect(phases).toEqual([
      'readiness',
      'admission',
      'application',
      'telemetry',
      'exit:143',
    ]);
  });

  it('changes readiness synchronously before waiting for propagation', async () => {
    jest.useFakeTimers();

    try {
      const beginDrain = jest.fn();
      const stopAcceptingRequests = jest.fn().mockResolvedValue(undefined);
      const shutdown = registerApplicationShutdownHandlers(
        shutdownOptions({
          getBudgets: () => ({
            ...immediateBudgets,
            readinessPropagationDelayMs: 100,
          }),
          beginDrain,
          stopAcceptingRequests,
        }),
      );
      const shutdownResult = shutdown.shutdownApplication(
        143,
        'SIGTERM',
        'SIGTERM',
      );
      const shutdownExpectation =
        expect(shutdownResult).rejects.toThrow('exit:143');

      expect(beginDrain).toHaveBeenCalledTimes(1);
      expect(stopAcceptingRequests).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(99);
      expect(stopAcceptingRequests).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1);

      await shutdownExpectation;
      expect(stopAcceptingRequests).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps providers alive until HTTP admission has drained', async () => {
    let finishAdmission!: () => void;
    const applicationClose = jest.fn().mockResolvedValue(undefined);
    const shutdown = registerApplicationShutdownHandlers(
      shutdownOptions({
        getApplication: () => ({ close: applicationClose }),
        stopAcceptingRequests: () =>
          new Promise<void>((resolve) => {
            finishAdmission = resolve;
          }),
      }),
    );
    const shutdownResult = shutdown.shutdownApplication(
      143,
      'SIGTERM',
      'SIGTERM',
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(applicationClose).not.toHaveBeenCalled();
    finishAdmission();

    await expect(shutdownResult).rejects.toThrow('exit:143');
    expect(applicationClose).toHaveBeenCalledWith('SIGTERM');
  });

  it('moves to telemetry after the shared application phase deadline', async () => {
    jest.useFakeTimers();

    try {
      const applicationClose = jest.fn(
        () => new Promise<void>(() => undefined),
      );
      const closeTelemetry = jest.fn().mockResolvedValue('closed');
      const onShutdownTimeout = jest.fn();
      const shutdown = registerApplicationShutdownHandlers(
        shutdownOptions({
          getApplication: () => ({ close: applicationClose }),
          stopAcceptingRequests: () => new Promise<void>(() => undefined),
          closeTelemetry,
          onShutdownTimeout,
        }),
      );
      const shutdownResult = shutdown.shutdownApplication(
        143,
        'SIGTERM',
        'SIGTERM',
      );
      const shutdownExpectation =
        expect(shutdownResult).rejects.toThrow('exit:143');
      await jest.runAllTimersAsync();

      await shutdownExpectation;
      expect(applicationClose).toHaveBeenCalledTimes(1);
      expect(closeTelemetry).toHaveBeenCalledWith(50);
      expect(onShutdownTimeout).toHaveBeenCalledWith('SIGTERM', 'admission');
      expect(onShutdownTimeout).toHaveBeenCalledWith('SIGTERM', 'application');
    } finally {
      jest.useRealTimers();
    }
  });

  it('reports an SDK close timeout without changing the exit contract', async () => {
    const onShutdownTimeout = jest.fn();
    const shutdown = registerApplicationShutdownHandlers(
      shutdownOptions({
        closeTelemetry: () => Promise.resolve('timed-out'),
        onShutdownTimeout,
      }),
    );

    await expect(
      shutdown.shutdownApplication(130, 'SIGINT', 'SIGINT'),
    ).rejects.toThrow('exit:130');
    expect(onShutdownTimeout).toHaveBeenCalledWith('SIGINT', 'telemetry');
  });

  it('bounds an SDK close that never settles', async () => {
    jest.useFakeTimers();

    try {
      const onShutdownTimeout = jest.fn();
      const shutdown = registerApplicationShutdownHandlers(
        shutdownOptions({
          closeTelemetry: () => new Promise<'closed'>(() => undefined),
          onShutdownTimeout,
        }),
      );
      const shutdownResult = shutdown.shutdownApplication(
        143,
        'SIGTERM',
        'SIGTERM',
      );
      const shutdownExpectation =
        expect(shutdownResult).rejects.toThrow('exit:143');
      await jest.runAllTimersAsync();

      await shutdownExpectation;
      expect(onShutdownTimeout).toHaveBeenCalledWith('SIGTERM', 'telemetry');
    } finally {
      jest.useRealTimers();
    }
  });

  it('continues to telemetry and exit when application error reporting throws', async () => {
    const closeTelemetry = jest.fn().mockResolvedValue('closed');
    const shutdown = registerApplicationShutdownHandlers(
      shutdownOptions({
        getApplication: () => ({
          close: () => Promise.reject(new Error('close failed')),
        }),
        closeTelemetry,
        onShutdownError: () => {
          throw new Error('logger failed');
        },
      }),
    );

    await expect(
      shutdown.shutdownApplication(1, 'failed bootstrap'),
    ).rejects.toThrow('exit:1');
    expect(closeTelemetry).toHaveBeenCalledTimes(1);
  });

  it('skips traffic propagation for a partially started application', async () => {
    const beginDrain = jest.fn();
    const stopAcceptingRequests = jest.fn().mockResolvedValue(undefined);
    const applicationClose = jest.fn().mockResolvedValue(undefined);
    const closeTelemetry = jest.fn().mockResolvedValue('not-initialized');
    const shutdown = registerApplicationShutdownHandlers(
      shutdownOptions({
        getApplication: () => ({ close: applicationClose }),
        getBudgets: () => ({
          ...immediateBudgets,
          readinessPropagationDelayMs: 5_000,
        }),
        isAcceptingRequests: () => false,
        beginDrain,
        stopAcceptingRequests,
        closeTelemetry,
      }),
    );

    await expect(
      shutdown.shutdownApplication(1, 'failed bootstrap'),
    ).rejects.toThrow('exit:1');
    expect(beginDrain).not.toHaveBeenCalled();
    expect(stopAcceptingRequests).not.toHaveBeenCalled();
    expect(applicationClose).toHaveBeenCalledWith(undefined);
    expect(closeTelemetry).toHaveBeenCalledTimes(1);
  });

  it('uses only the first shutdown trigger', async () => {
    let finishApplicationClose!: () => void;
    const applicationClose = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finishApplicationClose = resolve;
        }),
    );
    const exitProcess = jest.fn((exitCode: number): never => {
      throw new Error(`exit:${exitCode}`);
    });
    const shutdown = registerApplicationShutdownHandlers(
      shutdownOptions({
        getApplication: () => ({ close: applicationClose }),
        processTarget: {
          exit: exitProcess,
          once: jest.fn(),
        },
      }),
    );
    const sigtermShutdown = shutdown.shutdownApplication(
      143,
      'SIGTERM',
      'SIGTERM',
    );
    const sigintShutdown = shutdown.shutdownApplication(
      130,
      'SIGINT',
      'SIGINT',
    );

    expect(sigintShutdown).toBe(sigtermShutdown);
    for (
      let attempt = 0;
      attempt < 10 && applicationClose.mock.calls.length === 0;
      attempt += 1
    ) {
      await Promise.resolve();
    }
    expect(applicationClose).toHaveBeenCalledTimes(1);
    finishApplicationClose();

    await expect(sigtermShutdown).rejects.toThrow('exit:143');
    expect(applicationClose).toHaveBeenCalledTimes(1);
    expect(applicationClose).toHaveBeenCalledWith('SIGTERM');
    expect(exitProcess).toHaveBeenCalledWith(143);
  });

  it('uses conventional process exit codes for termination signals', () => {
    expect(getSignalExitCode('SIGINT')).toBe(130);
    expect(getSignalExitCode('SIGTERM')).toBe(143);
  });

  it('shuts down when startup error logging itself throws', async () => {
    const exitError = new Error('exit:1');
    const shutdownApplication = jest.fn(() => Promise.reject(exitError));

    await expect(
      reportStartupFailureAndShutdown(() => {
        throw new Error('logger failed');
      }, shutdownApplication),
    ).rejects.toBe(exitError);
    expect(shutdownApplication).toHaveBeenCalledTimes(1);
  });
});
