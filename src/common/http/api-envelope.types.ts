export interface ApiValidationErrorDetail {
  readonly field: string;
  readonly reason: string;
}

export interface ApiEnvelope<T = unknown> {
  readonly code: number;
  readonly message: string;
  readonly data: T | null;
  readonly errors: readonly ApiValidationErrorDetail[] | null;
}
