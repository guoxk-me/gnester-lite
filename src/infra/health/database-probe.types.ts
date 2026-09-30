export interface DatabasePingAttempt {
  readonly cleanup: Promise<void>;
  readonly result: Promise<void>;
}
