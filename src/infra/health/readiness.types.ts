export type ApplicationReadinessResult = Record<
  'application',
  {
    readonly status: 'up' | 'down';
    readonly message?: string;
  }
>;
