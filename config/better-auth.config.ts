import { ConfigService } from '@nestjs/config';

import { Environment } from './config.types';
import { assertCanonicalCorsOrigins } from './cors-origin';

export const BETTER_AUTH_BASE_PATH = '/api/auth';
export const BETTER_AUTH_CLIENT_IP_HEADER = 'x-gnester-client-ip';
export const BETTER_AUTH_LOCAL_DEVELOPMENT_SECRET =
  'gnester-lite-local-better-auth-secret-change-me';

const DEFAULT_DEVELOPMENT_TRUSTED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

export interface BetterAuthConfig {
  readonly baseURL: string;
  readonly isRateLimitEnabled: boolean;
  readonly secret: string;
  readonly trustedOrigins: string[];
  readonly useSecureCookies: boolean;
}

export function isBetterAuthRequestPath(requestPath: string): boolean {
  return (
    requestPath === BETTER_AUTH_BASE_PATH ||
    requestPath.startsWith(`${BETTER_AUTH_BASE_PATH}/`)
  );
}

export function readBetterAuthConfig(
  configService: ConfigService,
): BetterAuthConfig {
  const nodeEnv = configService.get<Environment>(
    'NODE_ENV',
    Environment.Development,
  );
  const port = configService.get<number>('PORT', 3000);
  const baseURL =
    configService.get<string>('BETTER_AUTH_URL') || `http://localhost:${port}`;
  const configuredTrustedOrigins = commaSeparatedOrigins(
    configService.get<string>('BETTER_AUTH_TRUSTED_ORIGINS'),
  );
  const canReuseCorsOrigins =
    configService.get<boolean>('CORS_ENABLED', true) &&
    configService.get<boolean>('CORS_CREDENTIALS', true);
  const corsOrigins = canReuseCorsOrigins
    ? commaSeparatedOrigins(configService.get<string>('CORS_ORIGINS')).filter(
        (origin) => origin !== '*',
      )
    : [];
  const trustedOrigins = [
    ...new Set([
      baseURL,
      ...(configuredTrustedOrigins.length > 0
        ? configuredTrustedOrigins
        : corsOrigins.length > 0
          ? corsOrigins
          : nodeEnv === Environment.Production
            ? []
            : DEFAULT_DEVELOPMENT_TRUSTED_ORIGINS),
    ]),
  ];

  // AI modified: Better Auth's redirect and CSRF boundary accepts only canonical HTTP(S) origins.
  assertBetterAuthBaseURL(baseURL, nodeEnv);
  assertCanonicalCorsOrigins(trustedOrigins);
  assertProductionBetterAuthOrigins(trustedOrigins, nodeEnv);

  return {
    baseURL,
    isRateLimitEnabled: configService.get<boolean>('rateLimit.enabled', true),
    secret:
      configService.get<string>('BETTER_AUTH_SECRET') ||
      BETTER_AUTH_LOCAL_DEVELOPMENT_SECRET,
    trustedOrigins,
    useSecureCookies:
      nodeEnv === Environment.Production ||
      new URL(baseURL).protocol === 'https:',
  };
}

function commaSeparatedOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function assertBetterAuthBaseURL(baseURL: string, nodeEnv: Environment): void {
  let parsedURL: URL;

  try {
    parsedURL = new URL(baseURL);
  } catch {
    throw new Error('BETTER_AUTH_URL must be a canonical HTTP(S) origin.');
  }

  if (
    !['http:', 'https:'].includes(parsedURL.protocol) ||
    parsedURL.origin !== baseURL
  ) {
    throw new Error('BETTER_AUTH_URL must be a canonical HTTP(S) origin.');
  }

  if (
    nodeEnv === Environment.Production &&
    (parsedURL.protocol !== 'https:' || isLoopbackHostname(parsedURL.hostname))
  ) {
    throw new Error(
      'BETTER_AUTH_URL must use a non-loopback HTTPS origin in production.',
    );
  }
}

function assertProductionBetterAuthOrigins(
  origins: string[],
  nodeEnv: Environment,
): void {
  if (nodeEnv !== Environment.Production) {
    return;
  }

  for (const origin of origins) {
    const parsedOrigin = new URL(origin);

    if (
      parsedOrigin.protocol !== 'https:' ||
      isLoopbackHostname(parsedOrigin.hostname)
    ) {
      throw new Error(
        'BETTER_AUTH_TRUSTED_ORIGINS must use non-loopback HTTPS origins in production.',
      );
    }
  }
}

function isLoopbackHostname(hostname: string): boolean {
  const unbracketedHostname = hostname.replace(/^\[(.*)]$/, '$1');

  return (
    /(?:^|\.)localhost$/.test(unbracketedHostname) ||
    unbracketedHostname === '::1' ||
    /^127(?:\.\d{1,3}){3}$/.test(unbracketedHostname)
  );
}
