export function assertCanonicalCorsOrigins(origins: readonly string[]): void {
  for (const origin of origins) {
    if (origin === '*') {
      continue;
    }

    let parsedOrigin: URL;

    try {
      parsedOrigin = new URL(origin);
    } catch {
      throw new Error(
        'CORS_ORIGINS entries must be canonical HTTP(S) origins.',
      );
    }

    if (
      !['http:', 'https:'].includes(parsedOrigin.protocol) ||
      parsedOrigin.origin !== origin
    ) {
      throw new Error(
        'CORS_ORIGINS entries must be canonical HTTP(S) origins.',
      );
    }
  }
}
