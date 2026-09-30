import { Environment } from './config-enums.js';

// AI modified: the browser reads this fixed cookie name for Axios's automatic XSRF header.
export const DEFAULT_CSRF_TOKEN_COOKIE_NAME = 'XSRF-TOKEN';
export const DEFAULT_CSRF_IDENTIFIER_COOKIE_NAME = 'gnester.csrf-id';

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
