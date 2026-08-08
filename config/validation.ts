import { createHash } from 'node:crypto';
import {
  plainToInstance,
  Transform,
  type TransformFnParams,
} from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';
import { csrfIdentifierCookieName, csrfTokenCookieName } from './cookie-name';
import { Environment } from './config.types';
import { assertCanonicalCorsOrigins } from './cors-origin';
import { environmentBooleanValue } from './environment-files';

const COOKIE_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const DEFAULT_REDIS_URL = 'redis://localhost:6379';
const PUBLIC_EXAMPLE_SECRET_FINGERPRINTS = new Set([
  '530b76c32224d660e82290094d753f2bb0c4c22df81aae0dcc2b483395af3db6',
  '942083283953abc6c18f0655475f4d402a9a705af3261384a333b48738cf671a',
  '1394f78068682857723def5410302be336b7c5edd3845649cdb2584085c48d18',
  '6bfebbd0f7bb550cc53837e70e4e3c18c363df229179cdcc4574bbb397c003d4',
  'a7e3d34141aabaa75a1db70a10bf42b49df2d785ac6219e54c1b4fa066460935',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function environmentBooleanTransform(params: TransformFnParams): unknown {
  return environmentBooleanValue(
    typeof params.key === 'string' && isRecord(params.obj as unknown)
      ? (params.obj as Record<string, unknown>)[params.key]
      : (params.value as unknown),
  );
}

function blankEnvironmentValue(params: TransformFnParams): unknown {
  const originalValue =
    typeof params.key === 'string' && isRecord(params.obj as unknown)
      ? (params.obj as Record<string, unknown>)[params.key]
      : (params.value as unknown);

  // AI modified: blank optional numbers stay absent instead of drifting to numeric zero.
  return typeof originalValue === 'string' && originalValue.trim().length === 0
    ? undefined
    : params.value;
}

function nonBlankEnvironmentNumber(params: TransformFnParams): unknown {
  const originalValue =
    typeof params.key === 'string' && isRecord(params.obj as unknown)
      ? (params.obj as Record<string, unknown>)[params.key]
      : (params.value as unknown);

  // AI modified: an empty numeric env value must not silently become zero and override a safer default.
  return typeof originalValue === 'string' && originalValue.trim().length === 0
    ? Number.NaN
    : params.value;
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV!: Environment;

  @IsInt()
  @Transform(nonBlankEnvironmentNumber)
  @Min(0)
  @Max(65535)
  PORT!: number;

  @IsString()
  @IsOptional()
  DB_HOST!: string;

  @IsInt()
  @Transform(nonBlankEnvironmentNumber)
  @IsOptional()
  @Min(1)
  @Max(65535)
  DB_PORT!: number;

  @IsString()
  @IsOptional()
  DB_USERNAME!: string;

  @IsString()
  @IsOptional()
  DB_PASSWORD!: string;

  @IsString()
  @IsOptional()
  DB_DATABASE!: string;

  @IsBoolean()
  @Transform(environmentBooleanTransform)
  @IsOptional()
  DB_SYNCHRONIZE: boolean = false;

  @IsBoolean()
  @Transform(environmentBooleanTransform)
  @IsOptional()
  DB_AUTO_LOAD_ENTITIES: boolean = true;

  @IsInt()
  @Transform(nonBlankEnvironmentNumber)
  @IsOptional()
  @Min(0)
  @Max(100)
  DB_RETRY_ATTEMPTS: number = 10;

  @IsInt()
  @Transform(nonBlankEnvironmentNumber)
  @IsOptional()
  @Min(0)
  @Max(300_000)
  DB_RETRY_DELAY: number = 3000;

  @IsUrl({
    require_tld: false,
    require_protocol: true,
    protocols: ['redis', 'rediss'],
  })
  @IsOptional()
  REDIS_URL?: string;

  @IsBoolean()
  @Transform(environmentBooleanTransform)
  @IsOptional()
  CORS_ENABLED: boolean = true;

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;

  @IsBoolean()
  @Transform(environmentBooleanTransform)
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

  @IsInt()
  @Transform(nonBlankEnvironmentNumber)
  @IsOptional()
  @Min(0)
  @Max(86_400)
  CORS_MAX_AGE: number = 600;

  @IsInt()
  @Transform(nonBlankEnvironmentNumber)
  @IsOptional()
  @Min(200)
  @Max(299)
  CORS_OPTIONS_SUCCESS_STATUS: number = 204;

  @IsString()
  @IsOptional()
  COOKIE_SECRET?: string;

  @IsBoolean()
  @Transform(environmentBooleanTransform)
  @IsOptional()
  COMPRESSION_ENABLED: boolean = true;

  @IsString()
  @IsOptional()
  @Matches(/^\d+(?:\.\d+)?\s*(?:b|kb|mb|gb|tb)?$/i)
  COMPRESSION_THRESHOLD: string = '1kb';

  @IsInt()
  @Transform(nonBlankEnvironmentNumber)
  @IsOptional()
  @Min(0)
  @Max(9)
  COMPRESSION_LEVEL: number = 6;

  @IsBoolean()
  @Transform(environmentBooleanTransform)
  @IsOptional()
  SESSION_ENABLED: boolean = true;

  @IsString()
  @IsOptional()
  SESSION_SECRET?: string;

  @IsString()
  @IsOptional()
  @Matches(COOKIE_NAME_PATTERN)
  SESSION_COOKIE_NAME: string = 'gnester.sid';

  @IsInt()
  @Transform(nonBlankEnvironmentNumber)
  @IsOptional()
  @Min(1000)
  @Max(31_536_000_000)
  SESSION_COOKIE_MAX_AGE: number = 86_400_000;

  @IsBoolean()
  @Transform(environmentBooleanTransform)
  @IsOptional()
  SESSION_COOKIE_SECURE?: boolean;

  @IsString()
  @IsIn(['lax', 'strict', 'none'])
  @IsOptional()
  SESSION_COOKIE_SAME_SITE: 'lax' | 'strict' | 'none' = 'lax';

  @IsBoolean()
  @Transform(environmentBooleanTransform)
  @IsOptional()
  CSRF_ENABLED: boolean = true;

  @IsString()
  @IsOptional()
  CSRF_SECRET?: string;

  @IsString()
  @IsOptional()
  @Matches(COOKIE_NAME_PATTERN)
  CSRF_COOKIE_NAME: string = 'gnester.csrf-token';

  @IsString()
  @IsOptional()
  @Matches(COOKIE_NAME_PATTERN)
  CSRF_IDENTIFIER_COOKIE_NAME: string = 'gnester.csrf-id';

  @IsBoolean()
  @Transform(environmentBooleanTransform)
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
  @MinLength(32)
  @IsOptional()
  BETTER_AUTH_SECRET?: string;

  @IsString()
  @IsOptional()
  BETTER_AUTH_URL?: string;

  @IsString()
  @IsOptional()
  BETTER_AUTH_TRUSTED_ORIGINS?: string;

  @IsString()
  @IsOptional()
  JWT_SECRET?: string;

  @IsString()
  @Matches(/^[1-9]\d*(?:s|m|h|d)$/)
  @IsOptional()
  JWT_ACCESS_TOKEN_TTL: string = '15m';

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  JWT_ISSUER: string = 'gnester-lite';

  @IsString()
  @IsNotEmpty()
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
  @Transform(environmentBooleanTransform)
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
  @Transform(environmentBooleanTransform)
  @IsOptional()
  SENTRY_ENABLED: boolean = true;

  @IsNumber()
  @Transform(blankEnvironmentValue)
  @IsOptional()
  @Min(0)
  @Max(1)
  SENTRY_TRACES_SAMPLE_RATE?: number;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  validateProductionInfrastructure(validatedConfig);
  validateCorsConfig(validatedConfig);
  validateBetterAuthConfig(validatedConfig);
  validateCookieSecurity(validatedConfig);
  validateLoggerConfig(validatedConfig);

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

  if (
    validatedConfig.NODE_ENV === Environment.Production &&
    !validatedConfig.BETTER_AUTH_SECRET
  ) {
    throw new Error('BETTER_AUTH_SECRET is required in production.');
  }

  if (
    validatedConfig.NODE_ENV === Environment.Production &&
    !validatedConfig.BETTER_AUTH_URL
  ) {
    throw new Error('BETTER_AUTH_URL is required in production.');
  }

  validateJwtClaims(validatedConfig);

  if (validatedConfig.NODE_ENV === Environment.Production) {
    // AI modified: fail startup before weak or checked-in placeholder secrets reach crypto consumers.
    validateProductionSecret('JWT_SECRET', validatedConfig.JWT_SECRET);
    validateProductionSecret('HMAC_SECRET', validatedConfig.HMAC_SECRET);
    validateProductionSecret(
      'BETTER_AUTH_SECRET',
      validatedConfig.BETTER_AUTH_SECRET,
    );

    if (validatedConfig.CSRF_ENABLED) {
      validateProductionSecret('CSRF_SECRET', validatedConfig.CSRF_SECRET);
    }

    validateProductionEncryptionKey(validatedConfig.ENCRYPTION_KEY);
    validateProductionSecretSeparation(validatedConfig);
  }

  // AI modified: local environments keep clone-ready Redis defaults only after production requirements are checked.
  validatedConfig.REDIS_URL ??= DEFAULT_REDIS_URL;

  return validatedConfig;
}

function validateProductionInfrastructure(config: EnvironmentVariables): void {
  if (config.NODE_ENV !== Environment.Production) {
    return;
  }

  const requiredValues: readonly [string, string | number | undefined][] = [
    ['DB_HOST', config.DB_HOST],
    ['DB_PORT', config.DB_PORT],
    ['DB_USERNAME', config.DB_USERNAME],
    ['DB_PASSWORD', config.DB_PASSWORD],
    ['DB_DATABASE', config.DB_DATABASE],
    ['REDIS_URL', config.REDIS_URL],
  ];

  for (const [name, value] of requiredValues) {
    if (
      value === undefined ||
      (typeof value === 'string' && value.trim().length === 0)
    ) {
      throw new Error(`${name} is required in production.`);
    }
  }

  if (config.PORT < 1) {
    throw new Error('PORT must be at least 1 in production.');
  }
}

function validateCookieSecurity(config: EnvironmentVariables): void {
  const isProduction = config.NODE_ENV === Environment.Production;
  const isCsrfCookieSecure = config.CSRF_COOKIE_SECURE ?? isProduction;
  const isSessionCookieSecure = config.SESSION_COOKIE_SECURE ?? false;

  if (isProduction && config.CSRF_ENABLED && !isCsrfCookieSecure) {
    throw new Error(
      'CSRF_COOKIE_SECURE must be true when CSRF is enabled in production.',
    );
  }

  if (config.CSRF_COOKIE_SAME_SITE === 'none' && !isCsrfCookieSecure) {
    throw new Error(
      'CSRF_COOKIE_SECURE must be true when CSRF_COOKIE_SAME_SITE is none.',
    );
  }

  if (
    config.SESSION_ENABLED &&
    config.SESSION_COOKIE_SAME_SITE === 'none' &&
    !isSessionCookieSecure
  ) {
    throw new Error(
      'SESSION_COOKIE_SECURE must be true when SESSION_COOKIE_SAME_SITE is none.',
    );
  }

  const activeCookieNames = [
    ...(config.SESSION_ENABLED
      ? [['SESSION_COOKIE_NAME', config.SESSION_COOKIE_NAME] as const]
      : []),
    ...(config.CSRF_ENABLED
      ? [
          [
            'CSRF_COOKIE_NAME',
            csrfTokenCookieName(config.CSRF_COOKIE_NAME, config.NODE_ENV),
          ] as const,
          [
            'CSRF_IDENTIFIER_COOKIE_NAME',
            csrfIdentifierCookieName(
              config.CSRF_IDENTIFIER_COOKIE_NAME,
              config.NODE_ENV,
            ),
          ] as const,
        ]
      : []),
  ];
  const names = new Set<string>();

  for (const [name, value] of activeCookieNames) {
    if (names.has(value)) {
      throw new Error(`${name} must use a distinct cookie name.`);
    }

    names.add(value);
  }
}

function validateLoggerConfig(config: EnvironmentVariables): void {
  if (
    config.NODE_ENV === Environment.Production &&
    config.LOGGER_JSON === false
  ) {
    throw new Error('LOGGER_JSON must be true in production.');
  }
}

function validateJwtClaims(config: EnvironmentVariables): void {
  if (config.JWT_ISSUER.trim().length === 0) {
    throw new Error('JWT_ISSUER must not be empty.');
  }

  if (config.JWT_AUDIENCE.trim().length === 0) {
    throw new Error('JWT_AUDIENCE must not be empty.');
  }

  const accessTokenTtlSeconds = jwtTtlSeconds(config.JWT_ACCESS_TOKEN_TTL);

  if (
    config.NODE_ENV === Environment.Production &&
    accessTokenTtlSeconds > 86_400
  ) {
    throw new Error(
      'JWT_ACCESS_TOKEN_TTL must not exceed 24 hours in production.',
    );
  }
}

function jwtTtlSeconds(ttl: string): number {
  const match = /^([1-9]\d*)(s|m|h|d)$/.exec(ttl);

  if (!match) {
    throw new Error(
      'JWT_ACCESS_TOKEN_TTL must use a positive s, m, h, or d duration.',
    );
  }

  const amount = Number(match[1]);
  const unit = match[2];

  if (!Number.isSafeInteger(amount)) {
    throw new Error(
      'JWT_ACCESS_TOKEN_TTL must use a safe positive integer duration.',
    );
  }

  let seconds: number;

  switch (unit) {
    case 's':
      seconds = amount;
      break;
    case 'm':
      seconds = amount * 60;
      break;
    case 'h':
      seconds = amount * 3600;
      break;
    case 'd':
      seconds = amount * 86_400;
      break;
    default:
      throw new Error('JWT_ACCESS_TOKEN_TTL has an unsupported unit.');
  }

  if (!Number.isSafeInteger(seconds)) {
    throw new Error(
      'JWT_ACCESS_TOKEN_TTL must resolve to a safe integer number of seconds.',
    );
  }

  return seconds;
}

function validateProductionSecret(
  name: 'JWT_SECRET' | 'HMAC_SECRET' | 'CSRF_SECRET' | 'BETTER_AUTH_SECRET',
  secret: string | undefined,
): void {
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error(`${name} must contain at least 32 bytes in production.`);
  }

  const lowerCaseSecret = secret.toLowerCase();
  const uniqueSecretBytes = new Set(Buffer.from(secret, 'utf8'));
  const hasPlaceholderMarker = [
    'change-me',
    'changeme',
    'replace-me',
    'replace_me',
  ].some((marker) => lowerCaseSecret.includes(marker));

  if (hasPlaceholderMarker) {
    throw new Error(`${name} must not use a placeholder value in production.`);
  }

  if (PUBLIC_EXAMPLE_SECRET_FINGERPRINTS.has(secretFingerprint(secret))) {
    throw new Error(
      `${name} must not use a public example value in production.`,
    );
  }

  if (
    uniqueSecretBytes.size < 8 ||
    hasShortRepeatingPeriod(Buffer.from(secret, 'utf8'))
  ) {
    throw new Error(
      `${name} must not use a low-diversity value in production.`,
    );
  }
}

function validateProductionEncryptionKey(key: string | undefined): void {
  if (!key) {
    return;
  }

  const decodedKey = Buffer.from(key, 'base64url');
  const uniqueBytes = new Set(decodedKey);

  if (
    decodedKey.length !== 32 ||
    // AI modified: canonical encoding prevents alternate strings from bypassing known-key fingerprints.
    decodedKey.toString('base64url') !== key ||
    PUBLIC_EXAMPLE_SECRET_FINGERPRINTS.has(secretFingerprint(key)) ||
    uniqueBytes.size < 16 ||
    hasShortRepeatingPeriod(decodedKey)
  ) {
    throw new Error(
      'ENCRYPTION_KEY must be a non-placeholder 32-byte base64url value in production.',
    );
  }
}

function validateProductionSecretSeparation(
  config: EnvironmentVariables,
): void {
  const secretMaterials = [
    ['JWT_SECRET', Buffer.from(config.JWT_SECRET ?? '', 'utf8')],
    ['HMAC_SECRET', Buffer.from(config.HMAC_SECRET ?? '', 'utf8')],
    [
      'BETTER_AUTH_SECRET',
      Buffer.from(config.BETTER_AUTH_SECRET ?? '', 'utf8'),
    ],
    ...(config.CSRF_ENABLED
      ? [
          [
            'CSRF_SECRET',
            Buffer.from(config.CSRF_SECRET ?? '', 'utf8'),
          ] as const,
        ]
      : []),
    ['ENCRYPTION_KEY', Buffer.from(config.ENCRYPTION_KEY ?? '', 'base64url')],
  ] as const;
  const fingerprints = new Map<string, string>();

  for (const [name, material] of secretMaterials) {
    const fingerprint = createHash('sha256').update(material).digest('hex');
    const existingName = fingerprints.get(fingerprint);

    if (existingName) {
      throw new Error(
        `${existingName} and ${name} must use distinct production secrets.`,
      );
    }

    fingerprints.set(fingerprint, name);
  }
}

function secretFingerprint(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

function hasShortRepeatingPeriod(bytes: Buffer): boolean {
  for (
    let period = 1;
    period <= Math.min(16, Math.floor(bytes.length / 2));
    period += 1
  ) {
    if (
      bytes.length % period === 0 &&
      bytes.every((byte, index) => byte === bytes[index % period])
    ) {
      return true;
    }
  }

  return false;
}

function validateCorsConfig(config: EnvironmentVariables): void {
  if (!config.CORS_ENABLED) {
    return;
  }

  const origins = commaSeparatedEntries(config.CORS_ORIGINS);
  const methods = commaSeparatedEntries(config.CORS_METHODS);
  const allowedHeaders = commaSeparatedEntries(config.CORS_ALLOWED_HEADERS);
  const exposedHeaders = commaSeparatedEntries(config.CORS_EXPOSED_HEADERS);

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

  assertCanonicalCorsOrigins(origins);

  // AI modified: reject values that Node cannot safely serialize into CORS response headers.
  if (
    methods.length === 0 ||
    methods.some((method) => !COOKIE_NAME_PATTERN.test(method))
  ) {
    throw new Error('CORS_METHODS must contain one or more HTTP tokens.');
  }

  for (const [name, headers] of [
    ['CORS_ALLOWED_HEADERS', allowedHeaders],
    ['CORS_EXPOSED_HEADERS', exposedHeaders],
  ] as const) {
    if (headers.some((header) => !COOKIE_NAME_PATTERN.test(header))) {
      throw new Error(`${name} entries must be valid HTTP header names.`);
    }
  }
}

function validateBetterAuthConfig(config: EnvironmentVariables): void {
  if (config.BETTER_AUTH_URL) {
    let parsedURL: URL;

    try {
      parsedURL = new URL(config.BETTER_AUTH_URL);
    } catch {
      throw new Error('BETTER_AUTH_URL must be a canonical HTTP(S) origin.');
    }

    if (
      !['http:', 'https:'].includes(parsedURL.protocol) ||
      parsedURL.origin !== config.BETTER_AUTH_URL
    ) {
      throw new Error('BETTER_AUTH_URL must be a canonical HTTP(S) origin.');
    }

    if (
      config.NODE_ENV === Environment.Production &&
      (parsedURL.protocol !== 'https:' ||
        isLoopbackBetterAuthHostname(parsedURL.hostname))
    ) {
      throw new Error(
        'BETTER_AUTH_URL must use a non-loopback HTTPS origin in production.',
      );
    }
  }

  const trustedOrigins = commaSeparatedEntries(
    config.BETTER_AUTH_TRUSTED_ORIGINS,
  );

  if (trustedOrigins.includes('*')) {
    throw new Error(
      'BETTER_AUTH_TRUSTED_ORIGINS must not contain a wildcard origin.',
    );
  }

  assertCanonicalCorsOrigins(trustedOrigins);

  if (config.NODE_ENV === Environment.Production) {
    for (const origin of trustedOrigins) {
      const parsedOrigin = new URL(origin);

      if (
        parsedOrigin.protocol !== 'https:' ||
        isLoopbackBetterAuthHostname(parsedOrigin.hostname)
      ) {
        throw new Error(
          'BETTER_AUTH_TRUSTED_ORIGINS must use non-loopback HTTPS origins in production.',
        );
      }
    }
  }
}

function isLoopbackBetterAuthHostname(hostname: string): boolean {
  const unbracketedHostname = hostname.replace(/^\[(.*)]$/, '$1');

  return (
    /(?:^|\.)localhost$/.test(unbracketedHostname) ||
    unbracketedHostname === '::1' ||
    /^127(?:\.\d{1,3}){3}$/.test(unbracketedHostname)
  );
}

function commaSeparatedEntries(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
