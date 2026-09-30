export interface ApplicationShutdownBudgets {
  readonly readinessPropagationDelayMs: number;
  readonly applicationCloseTimeoutMs: number;
  readonly telemetryCloseTimeoutMs: number;
}

export type ApplicationShutdownActionResult = 'completed' | 'timed-out';

export type ApplicationShutdownPhase =
  'readiness' | 'admission' | 'application' | 'telemetry';

export type ApplicationTelemetryCloseResult =
  'closed' | 'not-initialized' | 'timed-out';

export type ApplicationTerminationSignal = 'SIGINT' | 'SIGTERM';

export interface ApplicationCloseTarget {
  close(signal?: string): Promise<void>;
}

export interface ApplicationProcessTarget {
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
