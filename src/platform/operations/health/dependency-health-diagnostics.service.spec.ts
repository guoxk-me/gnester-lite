import { inspect } from 'node:util';

import { Logger } from '@nestjs/common';

import {
  DependencyHealthDiagnosticsService,
  DependencyHealthTimeoutError,
} from './dependency-health-diagnostics.service';

describe('DependencyHealthDiagnosticsService', () => {
  let service: DependencyHealthDiagnosticsService;
  let warningLogger: jest.SpiedFunction<Logger['warn']>;
  let recoveryLogger: jest.SpiedFunction<Logger['log']>;

  beforeEach(() => {
    jest.useFakeTimers();
    warningLogger = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    recoveryLogger = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    service = new DependencyHealthDiagnosticsService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('logs only allowlisted fields for a connection refusal', () => {
    const secretSentinel = 'dependency-log-secret-sentinel';
    const driverFailure = Object.assign(
      new Error(`mysql://audit:${secretSentinel}@database.internal/app`),
      {
        code: 'ECONNREFUSED',
        password: secretSentinel,
        sqlMessage: `access denied for ${secretSentinel}`,
        url: `mysql://audit:${secretSentinel}@database.internal/app`,
      },
    );

    service.reportFailure('database', driverFailure, 17);

    expect(warningLogger).toHaveBeenCalledWith(
      {
        event: 'dependency_readiness_failed',
        dependency: 'database',
        failureClass: 'connection_refused',
        isTimeout: false,
        durationMs: 17,
        failureCount: 1,
      },
      'Required dependency readiness check failed',
    );
    expect(
      inspect(warningLogger.mock.calls as unknown, {
        depth: null,
        showHidden: true,
      }),
    ).not.toContain(secretSentinel);
  });

  it.each([
    {
      failure: { code: 'ETIMEDOUT' },
      expectedFailureClass: 'timeout',
      isTimeout: true,
    },
    {
      failure: new DependencyHealthTimeoutError(),
      expectedFailureClass: 'timeout',
      isTimeout: true,
    },
    {
      failure: { cause: { code: 'EAI_AGAIN' } },
      expectedFailureClass: 'name_resolution',
      isTimeout: false,
    },
    {
      failure: { code: 'ECONNRESET' },
      expectedFailureClass: 'connection_lost',
      isTimeout: false,
    },
    {
      failure: { code: 'PROTOCOL_CONNECTION_LOST' },
      expectedFailureClass: 'connection_lost',
      isTimeout: false,
    },
    {
      failure: { code: 'ER_ACCESS_DENIED_ERROR' },
      expectedFailureClass: 'authentication',
      isTimeout: false,
    },
    {
      failure: { code: 'UNRECOGNIZED_PRIVATE_CODE' },
      expectedFailureClass: 'unavailable',
      isTimeout: false,
    },
  ])(
    'maps an allowlisted failure to $expectedFailureClass without logging its raw code',
    ({ failure, expectedFailureClass, isTimeout }) => {
      service.reportFailure('redis', failure, 9);

      expect(warningLogger).toHaveBeenCalledWith(
        {
          event: 'dependency_readiness_failed',
          dependency: 'redis',
          failureClass: expectedFailureClass,
          isTimeout,
          durationMs: 9,
          failureCount: 1,
        },
        'Required dependency readiness check failed',
      );
    },
  );

  it('deduplicates repeated failures and emits a periodic reminder', () => {
    const refusal = { code: 'ECONNREFUSED' };

    service.reportFailure('database', refusal, 4);
    service.reportFailure('database', new DependencyHealthTimeoutError(), 5);
    jest.advanceTimersByTime(59_999);
    service.reportFailure('database', refusal, 6);

    expect(warningLogger).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1);
    service.reportFailure('database', new DependencyHealthTimeoutError(), 7);

    expect(warningLogger).toHaveBeenNthCalledWith(
      2,
      {
        event: 'dependency_readiness_failed',
        dependency: 'database',
        failureClass: 'timeout',
        isTimeout: true,
        durationMs: 7,
        failureCount: 4,
      },
      'Required dependency readiness check failed',
    );
  });

  it('falls back safely when an error object has hostile accessors', () => {
    const hostileFailure = new Proxy(
      {},
      {
        get() {
          throw new Error('secret getter text');
        },
        getPrototypeOf() {
          throw new Error('secret prototype text');
        },
      },
    );

    expect(() =>
      service.reportFailure('redis', hostileFailure, 6),
    ).not.toThrow();
    expect(warningLogger).toHaveBeenCalledWith(
      {
        event: 'dependency_readiness_failed',
        dependency: 'redis',
        failureClass: 'unavailable',
        isTimeout: false,
        durationMs: 6,
        failureCount: 1,
      },
      'Required dependency readiness check failed',
    );
  });

  it('keeps continuously healthy probes silent', () => {
    service.reportRecovery('database', 2);
    service.reportRecovery('redis', 3);

    expect(warningLogger).not.toHaveBeenCalled();
    expect(recoveryLogger).not.toHaveBeenCalled();
  });

  it('logs one recovery after an outage', () => {
    service.reportFailure('database', { code: 'ECONNREFUSED' }, 8);
    jest.advanceTimersByTime(2_500);

    service.reportRecovery('database', 3);
    service.reportRecovery('database', 2);

    expect(warningLogger).toHaveBeenCalledTimes(1);
    expect(recoveryLogger).toHaveBeenCalledTimes(1);
    expect(recoveryLogger).toHaveBeenCalledWith(
      {
        event: 'dependency_readiness_recovered',
        dependency: 'database',
        previousFailureClass: 'connection_refused',
        durationMs: 3,
        outageDurationMs: 2_500,
        failureCount: 1,
      },
      'Required dependency readiness check recovered',
    );
  });

  it('bounds rapid failure and recovery flapping within one interval', () => {
    for (let probeAttempt = 0; probeAttempt < 100; probeAttempt += 1) {
      service.reportFailure(
        'redis',
        probeAttempt % 2 === 0
          ? { code: 'ECONNREFUSED' }
          : new DependencyHealthTimeoutError(),
        5,
      );
      service.reportRecovery('redis', 2);
    }

    expect(warningLogger).toHaveBeenCalledTimes(1);
    expect(recoveryLogger).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60_000);
    service.reportFailure('redis', new DependencyHealthTimeoutError(), 1_000);
    service.reportRecovery('redis', 3);

    expect(warningLogger).toHaveBeenCalledTimes(2);
    expect(recoveryLogger).toHaveBeenCalledTimes(2);
  });

  it('contains logger failures so readiness callers remain unaffected', () => {
    warningLogger.mockImplementationOnce(() => {
      throw new Error('warning transport failed');
    });
    recoveryLogger.mockImplementationOnce(() => {
      throw new Error('recovery transport failed');
    });

    expect(() =>
      service.reportFailure('redis', { code: 'ECONNREFUSED' }, Number.NaN),
    ).not.toThrow();
    expect(() => service.reportRecovery('redis', -1)).not.toThrow();
  });
});
