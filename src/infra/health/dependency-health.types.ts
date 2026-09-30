export type DependencyName = 'database' | 'redis';

export type DependencyFailureClass =
  | 'authentication'
  | 'connection_lost'
  | 'connection_refused'
  | 'name_resolution'
  | 'timeout'
  | 'unavailable';

export interface DependencyHealthState {
  readonly failedAtMs: number;
  readonly failureClass: DependencyFailureClass;
  readonly failureCount: number;
  readonly hasLoggedCurrentOutage: boolean;
  readonly isFailing: boolean;
  readonly lastFailureLoggedAtMs: number;
}
