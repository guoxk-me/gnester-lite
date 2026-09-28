import { Injectable, Logger } from '@nestjs/common';

const DEPENDENCY_FAILURE_LOG_INTERVAL_MS = 60_000;
const MAXIMUM_ERROR_CAUSE_DEPTH = 4;

type DependencyName = 'database' | 'redis';
type DependencyFailureClass =
  | 'authentication'
  | 'connection_lost'
  | 'connection_refused'
  | 'name_resolution'
  | 'timeout'
  | 'unavailable';

interface DependencyHealthState {
  readonly failedAtMs: number;
  readonly failureClass: DependencyFailureClass;
  readonly failureCount: number;
  readonly hasLoggedCurrentOutage: boolean;
  readonly isFailing: boolean;
  readonly lastFailureLoggedAtMs: number;
}

// AI modified: a private marker identifies health-budget expiry without inspecting error text.
export class DependencyHealthTimeoutError extends Error {
  constructor() {
    super('Dependency health check exceeded its time budget');
    this.name = DependencyHealthTimeoutError.name;
  }
}

@Injectable()
export class DependencyHealthDiagnosticsService {
  private readonly logger = new Logger(DependencyHealthDiagnosticsService.name);
  private readonly dependencyStates = new Map<
    DependencyName,
    DependencyHealthState
  >();

  reportFailure(
    dependency: DependencyName,
    failure: unknown,
    durationMs: number,
  ): void {
    const checkedAtMs = performance.now();
    let failureClass: DependencyFailureClass = 'unavailable';

    try {
      failureClass = this.failureClassFor(failure);
    } catch {
      // AI modified: hostile error accessors cannot escape diagnostics or alter readiness.
    }

    const dependencyState = this.dependencyStates.get(dependency);
    const failureCount = dependencyState?.isFailing
      ? dependencyState.failureCount + 1
      : 1;
    const shouldLogFailure =
      !dependencyState ||
      checkedAtMs - dependencyState.lastFailureLoggedAtMs >=
        DEPENDENCY_FAILURE_LOG_INTERVAL_MS;
    const nextDependencyState: DependencyHealthState = {
      failedAtMs: dependencyState?.isFailing
        ? dependencyState.failedAtMs
        : checkedAtMs,
      failureClass,
      failureCount,
      hasLoggedCurrentOutage:
        (dependencyState?.isFailing
          ? dependencyState.hasLoggedCurrentOutage
          : false) || shouldLogFailure,
      isFailing: true,
      lastFailureLoggedAtMs: shouldLogFailure
        ? checkedAtMs
        : (dependencyState?.lastFailureLoggedAtMs ?? checkedAtMs),
    };

    // AI modified: update state before best-effort logging so logger failures cannot cause a probe log storm.
    this.dependencyStates.set(dependency, nextDependencyState);

    if (!shouldLogFailure) {
      return;
    }

    try {
      this.logger.warn(
        {
          event: 'dependency_readiness_failed',
          dependency,
          failureClass,
          isTimeout: failureClass === 'timeout',
          durationMs: this.safeDurationMs(durationMs),
          failureCount,
        },
        'Required dependency readiness check failed',
      );
    } catch {
      // AI modified: diagnostics must never change the readiness result.
    }
  }

  reportRecovery(dependency: DependencyName, durationMs: number): void {
    const recoveredAtMs = performance.now();
    const dependencyState = this.dependencyStates.get(dependency);

    if (!dependencyState?.isFailing) {
      return;
    }

    // AI modified: retain the failure-log window across recovery so rapid flapping stays bounded.
    this.dependencyStates.set(dependency, {
      ...dependencyState,
      hasLoggedCurrentOutage: false,
      isFailing: false,
    });

    if (!dependencyState.hasLoggedCurrentOutage) {
      return;
    }

    try {
      this.logger.log(
        {
          event: 'dependency_readiness_recovered',
          dependency,
          previousFailureClass: dependencyState.failureClass,
          durationMs: this.safeDurationMs(durationMs),
          outageDurationMs: this.safeDurationMs(
            recoveredAtMs - dependencyState.failedAtMs,
          ),
          failureCount: dependencyState.failureCount,
        },
        'Required dependency readiness check recovered',
      );
    } catch {
      // AI modified: diagnostics must never change the readiness result.
    }
  }

  private failureClassFor(failure: unknown): DependencyFailureClass {
    let currentFailure = failure;

    for (
      let causeDepth = 0;
      causeDepth < MAXIMUM_ERROR_CAUSE_DEPTH;
      causeDepth += 1
    ) {
      if (currentFailure instanceof DependencyHealthTimeoutError) {
        return 'timeout';
      }

      if (typeof currentFailure !== 'object' || currentFailure === null) {
        break;
      }

      const failureDetails = currentFailure as {
        readonly cause?: unknown;
        readonly code?: unknown;
        readonly name?: unknown;
      };

      switch (failureDetails.code) {
        case 'ECONNABORTED':
        case 'ESOCKETTIMEDOUT':
        case 'ETIMEDOUT':
        case 'PROTOCOL_SEQUENCE_TIMEOUT':
          return 'timeout';
        case 'ECONNREFUSED':
          return 'connection_refused';
        case 'EAI_AGAIN':
        case 'ENOTFOUND':
          return 'name_resolution';
        case 'ECONNRESET':
        case 'EPIPE':
        case 'PROTOCOL_CONNECTION_LOST':
          return 'connection_lost';
        case 'ER_ACCESS_DENIED_CHANGE_USER_ERROR':
        case 'ER_ACCESS_DENIED_ERROR':
        case 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR':
        case 'NOAUTH':
        case 'WRONGPASS':
          return 'authentication';
      }

      if (failureDetails.name === 'TimeoutError') {
        return 'timeout';
      }

      currentFailure = failureDetails.cause;
    }

    return 'unavailable';
  }

  private safeDurationMs(durationMs: number): number {
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      return 0;
    }

    return Math.round(durationMs);
  }
}
