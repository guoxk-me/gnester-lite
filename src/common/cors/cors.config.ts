import { ConfigService } from '@nestjs/config';

import { assertCanonicalCorsOrigins } from 'config/cors-origin';
import { Environment } from 'config/config.types';

export interface CorsOptions {
  readonly origin: string | string[];
  readonly credentials: boolean;
  readonly methods: string[];
  readonly allowedHeaders?: string[];
  readonly exposedHeaders?: string[];
  readonly maxAge: number;
  readonly optionsSuccessStatus: number;
}

const DEFAULT_DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

export function createCorsOptions(
  configService: ConfigService,
  nodeEnv: Environment,
): CorsOptions | false {
  const isCorsEnabled = configService.get<boolean>('CORS_ENABLED', true);

  if (!isCorsEnabled) {
    return false;
  }

  const configuredOrigins = commaSeparatedEntries(
    configService.get<string>('CORS_ORIGINS'),
  );
  assertCanonicalCorsOrigins(configuredOrigins);
  const shouldAllowCredentials = configService.get<boolean>(
    'CORS_CREDENTIALS',
    true,
  );
  const origin = resolveOrigins(
    configuredOrigins,
    nodeEnv,
    shouldAllowCredentials,
  );
  const allowedHeaders = commaSeparatedEntries(
    configService.get<string>('CORS_ALLOWED_HEADERS'),
  );
  const exposedHeaders = commaSeparatedEntries(
    configService.get<string>('CORS_EXPOSED_HEADERS'),
  );

  return {
    origin,
    credentials: shouldAllowCredentials,
    methods: commaSeparatedEntries(
      configService.get<string>(
        'CORS_METHODS',
        'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      ),
    ),
    ...(allowedHeaders.length > 0 ? { allowedHeaders } : {}),
    ...(exposedHeaders.length > 0 ? { exposedHeaders } : {}),
    maxAge: configService.get<number>('CORS_MAX_AGE', 600),
    optionsSuccessStatus: configService.get<number>(
      'CORS_OPTIONS_SUCCESS_STATUS',
      204,
    ),
  };
}

function resolveOrigins(
  configuredOrigins: string[],
  nodeEnv: Environment,
  shouldAllowCredentials: boolean,
): string | string[] {
  if (configuredOrigins.length === 0) {
    if (nodeEnv === Environment.Production) {
      throw new Error(
        'CORS_ORIGINS is required when CORS is enabled in production.',
      );
    }

    return DEFAULT_DEVELOPMENT_ORIGINS;
  }

  if (configuredOrigins.includes('*')) {
    if (shouldAllowCredentials) {
      throw new Error(
        'CORS_CREDENTIALS=true cannot be combined with CORS_ORIGINS=*.',
      );
    }

    if (configuredOrigins.length > 1) {
      throw new Error('CORS_ORIGINS=* cannot be combined with other origins.');
    }

    return '*';
  }

  return configuredOrigins;
}

function commaSeparatedEntries(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
