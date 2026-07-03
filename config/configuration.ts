import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as yaml from 'js-yaml';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsString,
  Max,
  Min,
  ValidateNested,
  validateSync,
} from 'class-validator';
import { YamlConfig } from './config.types';

const YAML_CONFIG_FILENAME = 'config.yaml';

class AppVariables {
  @IsString()
  name: string;
}

class CacheVariables {
  @IsNumber()
  @Min(0)
  @Max(86_400_000)
  ttl: number;
}

class QueueVariables {
  @IsBoolean()
  enabled: boolean;

  @IsString()
  prefix: string;

  @IsNumber()
  @Min(1)
  defaultAttempts: number;

  @IsNumber()
  @Min(0)
  backoffDelay: number;

  @IsNumber()
  @Min(0)
  removeOnComplete: number;

  @IsNumber()
  @Min(0)
  removeOnFail: number;
}

class HttpVariables {
  @IsString()
  @IsUrl({ require_protocol: true })
  baseUrl: string;

  @IsNumber()
  @Min(1)
  timeout: number;

  @IsNumber()
  @Min(0)
  maxRedirects: number;

  @IsNumber()
  @Min(1)
  maxContentLength: number;

  @IsNumber()
  @Min(1)
  maxBodyLength: number;
}

class RateLimitThrottlerVariables {
  @IsString()
  name: string;

  @IsNumber()
  @Min(1)
  ttl: number;

  @IsNumber()
  @Min(1)
  limit: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  blockDuration?: number;
}

class RateLimitVariables {
  @IsBoolean()
  enabled: boolean;

  @IsString()
  trustProxy: string;

  @IsString()
  errorMessage: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RateLimitThrottlerVariables)
  throttlers: RateLimitThrottlerVariables[];
}

class YamlVariables {
  @IsObject()
  @ValidateNested()
  @Type(() => AppVariables)
  app: AppVariables;

  @IsObject()
  @ValidateNested()
  @Type(() => CacheVariables)
  cache: CacheVariables;

  @IsObject()
  @ValidateNested()
  @Type(() => ScheduleVariables)
  schedule: ScheduleVariables;

  @IsObject()
  @ValidateNested()
  @Type(() => QueueVariables)
  queue: QueueVariables;

  @IsObject()
  @ValidateNested()
  @Type(() => HttpVariables)
  http: HttpVariables;

  @IsObject()
  @ValidateNested()
  @Type(() => RateLimitVariables)
  rateLimit: RateLimitVariables;
}

// CN: 生成或校验 configuration 的 validate yaml config 配置；EN: Builds or validates the validate yaml config configuration for configuration.
export function validateYamlConfig(
  config: Record<string, unknown>,
): YamlConfig {
  // CN: 校验配置对象；EN: Validate the configuration object.
  const validatedConfig = plainToInstance(YamlVariables, config, {
    enableImplicitConversion: true,
  });

  // CN: 不跳过缺失字段；EN: Do not skip missing fields.
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
};
