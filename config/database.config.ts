import { registerAs } from '@nestjs/config';
import { DatabaseOptions, DbConnection } from './config.types';

const RUNTIME_ENTITY_GLOBS = ['dist/**/*.entity.js'];
const RUNTIME_MIGRATION_GLOBS = ['dist/migrations/*.js'];
const CLI_ENTITY_GLOBS = ['src/**/*.entity.ts', ...RUNTIME_ENTITY_GLOBS];
const CLI_MIGRATION_GLOBS = ['src/migrations/*.ts', ...RUNTIME_MIGRATION_GLOBS];

// CN: 数据库配置只从 DB_* 环境变量派生；EN: Database config is derived from DB_* env vars.
function parseBoolean(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true';
}

// CN: 生成或校验 configuration 的 get database env value 配置；EN: Builds or validates the get database env value configuration for configuration.
function getDatabaseEnvValue(key: string): string | undefined {
  return process.env[`DB_${key}`];
}

// CN: 生成或校验 configuration 的 create data source options 配置；EN: Builds or validates the create data source options configuration for configuration.
function createDataSourceOptions(): DatabaseOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const synchronize = parseBoolean(getDatabaseEnvValue('SYNCHRONIZE'), false);

  return {
    type: DbConnection.MYSQL,
    host: getDatabaseEnvValue('HOST') || 'localhost',
    port: parseInt(getDatabaseEnvValue('PORT') || '3306', 10),
    username: getDatabaseEnvValue('USERNAME') || 'root',
    password: getDatabaseEnvValue('PASSWORD') || '',
    database: getDatabaseEnvValue('DATABASE') || 'test',
    entities: RUNTIME_ENTITY_GLOBS,
    migrations: RUNTIME_MIGRATION_GLOBS,
    synchronize: !isProduction && synchronize,
    autoLoadEntities: parseBoolean(
      getDatabaseEnvValue('AUTO_LOAD_ENTITIES'),
      true,
    ),
    retryAttempts: parseInt(getDatabaseEnvValue('RETRY_ATTEMPTS') || '10', 10),
    retryDelay: parseInt(getDatabaseEnvValue('RETRY_DELAY') || '3000', 10),
  };
}

// CN: 运行时数据库配置；EN: Runtime database configuration.
export function createDatabaseOptions(): DatabaseOptions {
  return createDataSourceOptions();
}

// CN: TypeORM CLI 使用源码和构建产物路径；EN: TypeORM CLI uses source and build paths.
export function createDatabaseCliOptions(): DatabaseOptions {
  return {
    ...createDataSourceOptions(),
    entities: CLI_ENTITY_GLOBS,
    migrations: CLI_MIGRATION_GLOBS,
  };
}

export const databaseConfig = registerAs('database', createDatabaseOptions);
