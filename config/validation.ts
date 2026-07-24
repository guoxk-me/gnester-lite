import {
  plainToInstance,
  Transform,
  type TransformFnParams,
} from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';
import { Environment } from './config.types';

// CN: 将字符串布尔值转成真实布尔值；EN: Convert string booleans into real booleans.
function parseBoolean(value: unknown): unknown {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.toLowerCase();

    if (normalizedValue === 'true') {
      return true;
    }

    if (normalizedValue === 'false') {
      return false;
    }
  }

  return value;
}

// CN: 生成或校验 configuration 的 is record 配置；EN: Builds or validates the is record configuration for configuration.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// CN: 生成或校验 configuration 的 parse boolean transform 配置；EN: Builds or validates the parse boolean transform configuration for configuration.
function parseBooleanTransform(params: TransformFnParams): unknown {
  return parseBoolean(
    typeof params.key === 'string' && isRecord(params.obj as unknown)
      ? (params.obj as Record<string, unknown>)[params.key]
      : (params.value as unknown),
  );
}

// CN: 环境变量结构契约；EN: Contract for environment variables.
class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  @Min(0)
  @Max(65535)
  PORT: number;

  @IsString()
  @IsOptional()
  DB_HOST: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  DB_PORT: number;

  @IsString()
  @IsOptional()
  DB_USERNAME: string;

  @IsString()
  @IsOptional()
  DB_PASSWORD: string;

  @IsString()
  @IsOptional()
  DB_DATABASE: string;

  @IsBoolean()
  @Transform(parseBooleanTransform)
  @IsOptional()
  DB_SYNCHRONIZE: boolean = false;

  @IsBoolean()
  @Transform(parseBooleanTransform)
  @IsOptional()
  DB_AUTO_LOAD_ENTITIES: boolean = true;

  @IsNumber()
  @IsOptional()
  DB_RETRY_ATTEMPTS: number = 10;

  @IsNumber()
  @IsOptional()
  DB_RETRY_DELAY: number = 3000;

  @IsUrl({
    require_tld: false,
    require_protocol: true,
    protocols: ['redis', 'rediss'],
  })
  @IsOptional()
  REDIS_URL: string = 'redis://localhost:6379';

  @IsBoolean()
  @Transform(parseBooleanTransform)
  @IsOptional()
  CORS_ENABLED: boolean = true;

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;

  @IsBoolean()
  @Transform(parseBooleanTransform)
  @IsOptional()
  CORS_CREDENTIALS: boolean = true;

  @IsString()
  @IsOptional()
  CORS_METHODS: string = 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS';

  @IsString()
  @IsOptional()
  CORS_ALLOWED_HEADERS?: string;

  @IsString()
  @IsOptional()
  CORS_EXPOSED_HEADERS?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  CORS_MAX_AGE: number = 600;

  @IsNumber()
  @IsOptional()
  @Min(200)
  @Max(299)
  CORS_OPTIONS_SUCCESS_STATUS: number = 204;

  @IsString()
  @IsOptional()
  COOKIE_SECRET?: string;

  @IsBoolean()
  @Transform(parseBooleanTransform)
  @IsOptional()
  COMPRESSION_ENABLED: boolean = true;

  @IsString()
  @IsOptional()
  @Matches(/^\d+(?:\.\d+)?\s*(?:b|kb|mb|gb|tb)?$/i)
  COMPRESSION_THRESHOLD: string = '1kb';

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(9)
  COMPRESSION_LEVEL: number = 6;

  @IsBoolean()
  @Transform(parseBooleanTransform)
  @IsOptional()
  SESSION_ENABLED: boolean = true;

  @IsString()
  @IsOptional()
  SESSION_SECRET?: string;

  @IsString()
  @IsOptional()
  SESSION_COOKIE_NAME: string = 'gnester.sid';

  @IsNumber()
  @IsOptional()
  @Min(1000)
  SESSION_COOKIE_MAX_AGE: number = 86_400_000;

  @IsBoolean()
  @Transform(parseBooleanTransform)
  @IsOptional()
  SESSION_COOKIE_SECURE?: boolean;

  @IsString()
  @IsIn(['lax', 'strict', 'none'])
  @IsOptional()
  SESSION_COOKIE_SAME_SITE: 'lax' | 'strict' | 'none' = 'lax';

  @IsBoolean()
  @Transform(parseBooleanTransform)
  @IsOptional()
  CSRF_ENABLED: boolean = true;

  @IsString()
  @IsOptional()
  CSRF_SECRET?: string;

  @IsString()
  @IsOptional()
  CSRF_COOKIE_NAME: string = 'gnester.csrf-token';

  @IsString()
  @IsOptional()
  CSRF_IDENTIFIER_COOKIE_NAME: string = 'gnester.csrf-id';

  @IsBoolean()
  @Transform(parseBooleanTransform)
  @IsOptional()
  CSRF_COOKIE_SECURE?: boolean;

  @IsString()
  @IsIn(['lax', 'strict', 'none'])
  @IsOptional()
  CSRF_COOKIE_SAME_SITE: 'lax' | 'strict' | 'none' = 'lax';

  @IsString()
  @Matches(/^[A-Za-z0-9-]+$/)
  @IsOptional()
  CSRF_HEADER_NAME: string = 'x-csrf-token';

  @IsString()
  @IsOptional()
  JWT_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_TOKEN_TTL: string = '15m';

  @IsString()
  @IsOptional()
  JWT_ISSUER: string = 'gnester-lite';

  @IsString()
  @IsOptional()
  JWT_AUDIENCE: string = 'gnester-lite';

  @IsString()
  @IsOptional()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  ENCRYPTION_KEY?: string;

  @IsString()
  @IsOptional()
  HMAC_SECRET?: string;

  @IsBoolean()
  @Transform(parseBooleanTransform)
  @IsOptional()
  LOGGER_JSON?: boolean;

  @IsString()
  @Matches(
    /^(log|fatal|error|warn|debug|verbose)(\s*,\s*(log|fatal|error|warn|debug|verbose))*$/,
  )
  @IsOptional()
  LOGGER_LEVELS?: string;

  @IsString()
  @IsOptional()
  SENTRY_DSN?: string;

  @IsBoolean()
  @Transform(parseBooleanTransform)
  @IsOptional()
  SENTRY_ENABLED: boolean = true;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  SENTRY_TRACES_SAMPLE_RATE?: number;

}

// CN: 生成或校验 configuration 的 validate 配置；EN: Builds or validates the validate configuration for configuration.
export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  // CN: 校验环境配置对象；EN: Validate the environment configuration object.
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  // CN: 不跳过缺失字段；EN: Do not skip missing fields.
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  validateCorsConfig(validatedConfig);

  if (
    validatedConfig.NODE_ENV === Environment.Production &&
    !validatedConfig.JWT_SECRET
  ) {
    throw new Error('JWT_SECRET is required in production.');
  }

  if (
    validatedConfig.NODE_ENV === Environment.Production &&
    !validatedConfig.ENCRYPTION_KEY
  ) {
    throw new Error('ENCRYPTION_KEY is required in production.');
  }

  if (
    validatedConfig.NODE_ENV === Environment.Production &&
    !validatedConfig.HMAC_SECRET
  ) {
    throw new Error('HMAC_SECRET is required in production.');
  }

  if (
    validatedConfig.NODE_ENV === Environment.Production &&
    validatedConfig.CSRF_ENABLED &&
    !validatedConfig.CSRF_SECRET
  ) {
    throw new Error(
      'CSRF_SECRET is required in production when CSRF is enabled.',
    );
  }

  return validatedConfig;
}

// CN: 生产跨域配置必须明确且安全；EN: Production CORS config must be explicit and safe.
function validateCorsConfig(config: EnvironmentVariables): void {
  if (!config.CORS_ENABLED) {
    return;
  }

  const origins = parseCsv(config.CORS_ORIGINS);

  if (config.NODE_ENV === Environment.Production && origins.length === 0) {
    throw new Error(
      'CORS_ORIGINS is required when CORS is enabled in production.',
    );
  }

  if (config.CORS_CREDENTIALS && origins.includes('*')) {
    throw new Error(
      'CORS_CREDENTIALS=true cannot be combined with CORS_ORIGINS=*.',
    );
  }

  if (origins.includes('*') && origins.length > 1) {
    throw new Error('CORS_ORIGINS=* cannot be combined with other origins.');
  }
}

// CN: 生成或校验 configuration 的 parse csv 配置；EN: Builds or validates the parse csv configuration for configuration.
function parseCsv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
