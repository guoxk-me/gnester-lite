import { Environment } from './config.types';

export const DEFAULT_CSRF_TOKEN_COOKIE_NAME = 'gnester.csrf-token';
export const DEFAULT_CSRF_IDENTIFIER_COOKIE_NAME = 'gnester.csrf-id';

// AI modified: validation and runtime must compare the same production cookie names.
export function csrfTokenCookieName(
  configuredName: string | undefined,
  nodeEnv: Environment,
): string {
  if (
    nodeEnv === Environment.Production &&
    (!configuredName || configuredName === DEFAULT_CSRF_TOKEN_COOKIE_NAME)
  ) {
    return `__Host-${DEFAULT_CSRF_TOKEN_COOKIE_NAME}`;
  }

  return configuredName || DEFAULT_CSRF_TOKEN_COOKIE_NAME;
}

export function csrfIdentifierCookieName(
  configuredName: string | undefined,
  nodeEnv: Environment,
): string {
  if (
    nodeEnv === Environment.Production &&
    (!configuredName || configuredName === DEFAULT_CSRF_IDENTIFIER_COOKIE_NAME)
  ) {
    return `__Host-${DEFAULT_CSRF_IDENTIFIER_COOKIE_NAME}`;
  }

  return configuredName || DEFAULT_CSRF_IDENTIFIER_COOKIE_NAME;
}
