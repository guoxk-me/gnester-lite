import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as yaml from 'js-yaml';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsTimeZone,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  validateSync,
} from 'class-validator';
import { YamlConfig } from './config.types';

const YAML_CONFIG_FILENAME = 'config.yaml';
const REDIS_NAMESPACE_SEGMENT_MAX_LENGTH = 64;
// AI modified: keep shared-Redis namespace segments bounded and free of separators or control characters.
const REDIS_NAMESPACE_SEGMENT_PATTERN = /^(?=.*[A-Za-z0-9])[A-Za-z0-9._-]+$/;

class AppVariables {
  @IsString()
  @IsNotEmpty()
  @MaxLength(REDIS_NAMESPACE_SEGMENT_MAX_LENGTH)
  @Matches(REDIS_NAMESPACE_SEGMENT_PATTERN)
  name!: string;
}

class CacheVariables {
  @IsInt()
  @Min(0)
  @Max(86_400_000)
  ttl!: number;
}

class ScheduleVariables {
  @IsBoolean()
  enabled!: boolean;

  @IsString()
  @IsTimeZone()
  timeZone!: string;
}

class QueueVariables {
  @IsBoolean()
  enabled!: boolean;

  @IsString()
  @IsNotEmpty()
  @MaxLength(REDIS_NAMESPACE_SEGMENT_MAX_LENGTH)
  @Matches(REDIS_NAMESPACE_SEGMENT_PATTERN)
  prefix!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  defaultAttempts!: number;

  @IsInt()
  @Min(0)
  @Max(86_400_000)
  backoffDelay!: number;

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  removeOnComplete!: number;

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  removeOnFail!: number;
}

class HttpVariables {
  @IsString()
  // AI modified: reject schemes that the outbound HTTP transport cannot execute.
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  baseUrl!: string;

  @IsInt()
  @Min(1)
  @Max(300_000)
  timeout!: number;

  @IsInt()
  @Min(0)
  @Max(20)
  maxRedirects!: number;

  @IsInt()
  @Min(1)
  @Max(1_073_741_824)
  maxContentLength!: number;

  @IsInt()
  @Min(1)
  @Max(1_073_741_824)
  maxBodyLength!: number;
}

class RateLimitThrottlerVariables {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(1)
  @Max(86_400_000)
  ttl!: number;

  @IsInt()
  @Min(1)
  @Max(1_000_000)
  limit!: number;

  @IsInt()
  @Min(1)
  @Max(86_400_000)
  @IsOptional()
  blockDuration?: number;
}

class RateLimitVariables {
  @IsBoolean()
  enabled!: boolean;

  @IsString()
  trustProxy!: string;

  @IsString()
  @IsNotEmpty()
  // AI modified: a configured 429 response must retain a meaningful client-facing message.
  @Matches(/\S/)
  errorMessage!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RateLimitThrottlerVariables)
  throttlers!: RateLimitThrottlerVariables[];
}

class YamlVariables {
  @IsObject()
  @ValidateNested()
  @Type(() => AppVariables)
  app!: AppVariables;

  @IsObject()
  @ValidateNested()
  @Type(() => CacheVariables)
  cache!: CacheVariables;

  @IsObject()
  @ValidateNested()
  @Type(() => ScheduleVariables)
  schedule!: ScheduleVariables;

  @IsObject()
  @ValidateNested()
  @Type(() => QueueVariables)
  queue!: QueueVariables;

  @IsObject()
  @ValidateNested()
  @Type(() => HttpVariables)
  http!: HttpVariables;

  @IsObject()
  @ValidateNested()
  @Type(() => RateLimitVariables)
  rateLimit!: RateLimitVariables;
}

export function validateYamlConfig(
  config: Record<string, unknown>,
): YamlConfig {
  // AI modified: YAML scalars stay exact and undeclared keys fail closed instead of drifting silently.
  const validatedConfig = plainToInstance(YamlVariables, config);

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  const throttlerNames = validatedConfig.rateLimit.throttlers.map(
    (throttler) => throttler.name,
  );

  if (new Set(throttlerNames).size !== throttlerNames.length) {
    throw new Error('Rate-limit throttler names must be unique.');
  }

  if (!throttlerNames.includes('short')) {
    throw new Error(
      'The "short" rate-limit throttler is required by credential entrypoints.',
    );
  }

  return validatedConfig;
}

export default (): YamlConfig => {
  const configYaml = readFileSync(
    join(__dirname, YAML_CONFIG_FILENAME),
    'utf8',
  );
  const config = yaml.load(configYaml) as Record<string, unknown>;

  return validateYamlConfig(config);
};
