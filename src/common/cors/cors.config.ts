// CN: 配置文件，生成 cors common 的运行参数；EN: Config file builds runtime settings for cors common.
import { ConfigService } from '@nestjs/config';

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

// CN: 生成或校验 cors common 的 create cors options 配置；EN: Builds or validates the create cors options configuration for cors common.
export function createCorsOptions(
  configService: ConfigService,
  nodeEnv: Environment,
): CorsOptions | false {
  const enabled = configService.get<boolean>('CORS_ENABLED', true);

  if (!enabled) {
    return false;
  }

  const configuredOrigins = parseCsv(configService.get<string>('CORS_ORIGINS'));
  const credentials = configService.get<boolean>('CORS_CREDENTIALS', true);
  const origin = resolveOrigins(configuredOrigins, nodeEnv, credentials);
  const allowedHeaders = parseCsv(
    configService.get<string>('CORS_ALLOWED_HEADERS'),
  );
  const exposedHeaders = parseCsv(
    configService.get<string>('CORS_EXPOSED_HEADERS'),
  );

  return {
    origin,
    credentials,
    methods: parseCsv(
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

// CN: 生成或校验 cors common 的 resolve origins 配置；EN: Builds or validates the resolve origins configuration for cors common.
function resolveOrigins(
  configuredOrigins: string[],
  nodeEnv: Environment,
  credentials: boolean,
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
    if (credentials) {
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

// CN: 生成或校验 cors common 的 parse csv 配置；EN: Builds or validates the parse csv configuration for cors common.
function parseCsv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
