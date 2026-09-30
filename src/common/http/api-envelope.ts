import type { ApiEnvelope } from './api-envelope.types.js';

// AI modified: shared success/failure HTTP envelope kept framework-free for cross-layer reuse.

export function isApiEnvelope(value: unknown): value is ApiEnvelope {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.code === 'number' &&
    typeof candidate.message === 'string' &&
    'data' in candidate &&
    'errors' in candidate
  );
}
