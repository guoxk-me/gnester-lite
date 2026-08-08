import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import type { PoolConnection, RowDataPacket } from 'mysql2';
import { DataSource } from 'typeorm';

import {
  DependencyHealthDiagnosticsService,
  DependencyHealthTimeoutError,
} from './dependency-health-diagnostics.service';

const DATABASE_HEALTH_TIMEOUT_MS = 1_000;

interface DatabasePingAttempt {
  readonly cleanup: Promise<void>;
  readonly result: Promise<void>;
}

@Injectable()
export class DatabaseHealthIndicator {
  private databasePingAttempt: DatabasePingAttempt | undefined;

  constructor(
    private readonly dataSource: DataSource,
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly dependencyHealthDiagnostics: DependencyHealthDiagnosticsService,
  ) {}

  async pingCheck(key: string = 'database'): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const startedAtMs = performance.now();

    try {
      await this.getDatabasePing();
      this.dependencyHealthDiagnostics.reportRecovery(
        'database',
        performance.now() - startedAtMs,
      );
      return indicator.up();
    } catch (failure) {
      // AI modified: preserve the driver failure only for closed-set internal classification.
      this.dependencyHealthDiagnostics.reportFailure(
        'database',
        failure,
        performance.now() - startedAtMs,
      );
    }

    // AI modified: public readiness responses never expose raw database driver errors.
    return indicator.down('Database ping failed');
  }

  private startDatabasePingAttempt(): DatabasePingAttempt {
    const queryRunner = this.dataSource.createQueryRunner();
    const timeoutFailure = new DependencyHealthTimeoutError();
    let databaseConnection: PoolConnection | undefined;
    let isDatabaseConnectionDestroyed = false;
    let isConnectionSettled = false;
    let isQueryRunnerReleased = false;
    let timeout: NodeJS.Timeout | undefined;
    const destroyDatabaseConnection = (): void => {
      if (!databaseConnection || isDatabaseConnectionDestroyed) {
        return;
      }

      isDatabaseConnectionDestroyed = true;

      try {
        databaseConnection.destroy();
      } catch {
        // AI modified: the timeout result must survive an already-broken driver connection.
      }
    };
    const releaseQueryRunner = async (): Promise<void> => {
      if (isQueryRunnerReleased) {
        return;
      }

      isQueryRunnerReleased = true;
      await queryRunner.release();
    };
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        reject(timeoutFailure);
      }, DATABASE_HEALTH_TIMEOUT_MS);
      timeout.unref();
    });
    const connectionPromise = (
      queryRunner.connect() as Promise<PoolConnection>
    ).then(
      (connectedDatabase) => {
        isConnectionSettled = true;
        return connectedDatabase;
      },
      (failure: unknown) => {
        isConnectionSettled = true;
        throw failure;
      },
    );
    const result = (async (): Promise<void> => {
      try {
        databaseConnection = await Promise.race([
          connectionPromise,
          timeoutPromise,
        ]);
        await Promise.race([
          this.pingDatabaseConnection(databaseConnection),
          timeoutPromise,
        ]);
      } catch (failure) {
        destroyDatabaseConnection();
        throw failure;
      } finally {
        if (timeout) {
          clearTimeout(timeout);
        }

        // AI modified: only an uncancellable pending acquisition may outlive the public result.
        if (isConnectionSettled) {
          await releaseQueryRunner();
        }
      }
    })();
    const cleanup = result
      .then(
        () => undefined,
        () => undefined,
      )
      .then(async () => {
        // AI modified: retain the attempt until an uncancellable pool acquisition settles.
        await connectionPromise.catch(() => undefined);
        await releaseQueryRunner();
      });

    return { cleanup, result };
  }

  private getDatabasePing(): Promise<void> {
    if (this.databasePingAttempt) {
      return this.databasePingAttempt.result;
    }

    // AI modified: callers share one cancellable attempt, preventing pool and Promise-reaction buildup.
    const databasePingAttempt = this.startDatabasePingAttempt();
    this.databasePingAttempt = databasePingAttempt;
    void databasePingAttempt.cleanup
      .finally(() => {
        if (this.databasePingAttempt === databasePingAttempt) {
          this.databasePingAttempt = undefined;
        }
      })
      .catch(() => undefined);

    return databasePingAttempt.result;
  }

  private pingDatabaseConnection(
    databaseConnection: PoolConnection,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // AI modified: mysql2 enforces the same inactivity budget below the public probe deadline.
      databaseConnection.query<RowDataPacket[]>(
        {
          sql: 'SELECT 1',
          timeout: DATABASE_HEALTH_TIMEOUT_MS,
        },
        (failure) => {
          if (failure) {
            reject(failure);
            return;
          }

          resolve();
        },
      );
    });
  }
}
