export type SentryCloseResult = 'closed' | 'not-initialized' | 'timed-out';

export interface SentryShutdownTarget {
  isInitialized(): boolean;
  close(timeoutMs: number): Promise<boolean>;
}
