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
  @Type(() => QueueVariables)
  queue: QueueVariables;
}

export default (): YamlConfig => {
  const configYaml = readFileSync(
    join(__dirname, YAML_CONFIG_FILENAME),
    'utf8',
  );
  const config = yaml.load(configYaml) as Record<string, unknown>;
  // validate the configuration object 校验配置对象
  const validatedConfig = plainToInstance(YamlVariables, config, {
    enableImplicitConversion: true,
  });

  // Don't skip missing fields(property) 不跳过缺失字段
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
};
