import { HealthIndicatorService } from '@nestjs/terminus';
import { DataSource } from 'typeorm';

import { DatabaseHealthIndicator } from './database-health.indicator';
import {
  DependencyHealthDiagnosticsService,
  DependencyHealthTimeoutError,
} from './dependency-health-diagnostics.service';

interface DatabaseQueryOptions {
  readonly sql: string;
  readonly timeout: number;
}

type DatabaseQueryCallback = (failure: Error | null) => void;

describe('DatabaseHealthIndicator', () => {
  const databaseConnection: {
    query: jest.Mock<void, [DatabaseQueryOptions, DatabaseQueryCallback]>;
    destroy: jest.Mock<void, []>;
  } = {
    query: jest.fn<void, [DatabaseQueryOptions, DatabaseQueryCallback]>(),
    destroy: jest.fn<void, []>(),
  };
  const queryRunner: {
    connect: jest.Mock<Promise<unknown>, []>;
    release: jest.Mock<Promise<void>, []>;
  } = {
    connect: jest.fn<Promise<unknown>, []>(),
    release: jest.fn<Promise<void>, []>(),
  };
  const dataSource: {
    createQueryRunner: jest.Mock<unknown, []>;
  } = {
    createQueryRunner: jest.fn<unknown, []>(),
  };
  const dependencyHealthDiagnostics: jest.Mocked<
    Pick<DependencyHealthDiagnosticsService, 'reportFailure' | 'reportRecovery'>
  > = {
    reportFailure: jest.fn(),
    reportRecovery: jest.fn(),
  };
  let indicator: DatabaseHealthIndicator;

  beforeEach(() => {
    databaseConnection.query
      .mockReset()
      .mockImplementation((_options, done) => {
        done(null);
      });
    databaseConnection.destroy.mockReset();
    queryRunner.connect.mockReset().mockResolvedValue(databaseConnection);
    queryRunner.release.mockReset().mockResolvedValue(undefined);
    dataSource.createQueryRunner.mockReset().mockReturnValue(queryRunner);
    dependencyHealthDiagnostics.reportFailure.mockReset();
    dependencyHealthDiagnostics.reportRecovery.mockReset();
    indicator = new DatabaseHealthIndicator(
      dataSource as unknown as DataSource,
      new HealthIndicatorService(),
      dependencyHealthDiagnostics as unknown as DependencyHealthDiagnosticsService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports the database as ready after a successful bounded ping', async () => {
    await expect(indicator.pingCheck()).resolves.toEqual({
      database: {
        status: 'up',
      },
    });
    expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
    expect(databaseConnection.query).toHaveBeenCalledWith(
      {
        sql: 'SELECT 1',
        timeout: 1_000,
      },
      expect.any(Function),
    );
    expect(databaseConnection.destroy).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
    expect(dependencyHealthDiagnostics.reportRecovery).toHaveBeenCalledWith(
      'database',
      expect.any(Number),
    );
    expect(dependencyHealthDiagnostics.reportFailure).not.toHaveBeenCalled();
  });

  it('sanitizes rejected database connection errors', async () => {
    const driverFailure = Object.assign(
      new Error('connection details must not escape'),
      { code: 'ECONNREFUSED' },
    );
    queryRunner.connect.mockRejectedValueOnce(driverFailure);

    await expect(indicator.pingCheck()).resolves.toEqual({
      database: {
        status: 'down',
        message: 'Database ping failed',
      },
    });
    expect(dependencyHealthDiagnostics.reportFailure).toHaveBeenCalledWith(
      'database',
      driverFailure,
      expect.any(Number),
    );
    expect(databaseConnection.query).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
    expect(dependencyHealthDiagnostics.reportRecovery).not.toHaveBeenCalled();
  });

  it('destroys the pooled connection when a query exceeds its readiness budget', async () => {
    jest.useFakeTimers();
    databaseConnection.query.mockImplementationOnce(() => undefined);

    const pendingCheck = indicator.pingCheck();
    await jest.advanceTimersByTimeAsync(1_000);

    await expect(pendingCheck).resolves.toEqual({
      database: {
        status: 'down',
        message: 'Database ping failed',
      },
    });
    expect(databaseConnection.destroy).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
    expect(dependencyHealthDiagnostics.reportFailure).toHaveBeenCalledWith(
      'database',
      expect.any(DependencyHealthTimeoutError),
      1_000,
    );
  });

  it('shares one timed attempt across callers and retries after timeout', async () => {
    jest.useFakeTimers();
    databaseConnection.query.mockImplementation(() => undefined);

    const firstCheck = indicator.pingCheck();
    const concurrentCheck = indicator.pingCheck();

    // AI modified: flush the async connection before asserting shared query execution.
    await jest.advanceTimersByTimeAsync(0);
    expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
    expect(databaseConnection.query).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1_000);
    await expect(firstCheck).resolves.toMatchObject({
      database: { status: 'down' },
    });
    await expect(concurrentCheck).resolves.toMatchObject({
      database: { status: 'down' },
    });
    expect(dependencyHealthDiagnostics.reportFailure).toHaveBeenCalledTimes(2);
    const [firstFailureReport, concurrentFailureReport] =
      dependencyHealthDiagnostics.reportFailure.mock.calls;
    expect(concurrentFailureReport?.[1]).toBe(firstFailureReport?.[1]);
    expect(databaseConnection.destroy).toHaveBeenCalledTimes(1);

    databaseConnection.query.mockImplementation((_options, done) => {
      done(null);
    });

    await expect(indicator.pingCheck()).resolves.toMatchObject({
      database: { status: 'up' },
    });
    expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(2);
    expect(databaseConnection.query).toHaveBeenCalledTimes(2);
  });

  it('retains one pool waiter until a late connection is safely released', async () => {
    jest.useFakeTimers();
    let provideDatabaseConnection = (): void => undefined;
    const delayedConnection = new Promise<unknown>((resolve) => {
      provideDatabaseConnection = () => resolve(databaseConnection);
    });
    queryRunner.connect.mockReturnValueOnce(delayedConnection);

    const pendingCheck = indicator.pingCheck();
    await jest.advanceTimersByTimeAsync(1_000);
    await expect(pendingCheck).resolves.toMatchObject({
      database: { status: 'down' },
    });

    const repeatedChecks = Array.from({ length: 100 }, () =>
      indicator.pingCheck(),
    );
    const repeatedResults = await Promise.all(repeatedChecks);

    expect(repeatedResults).toHaveLength(100);
    expect(
      repeatedResults.every(
        (healthResult) => healthResult.database?.status === 'down',
      ),
    ).toBe(true);
    expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
    expect(databaseConnection.destroy).not.toHaveBeenCalled();
    expect(queryRunner.release).not.toHaveBeenCalled();

    provideDatabaseConnection();
    await delayedConnection;
    await jest.advanceTimersByTimeAsync(0);

    expect(databaseConnection.destroy).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
    expect(databaseConnection.query).not.toHaveBeenCalled();

    await expect(indicator.pingCheck()).resolves.toMatchObject({
      database: { status: 'up' },
    });
    expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(2);
  });
});
