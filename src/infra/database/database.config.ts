import { registerAs } from '@nestjs/config';

import type { DatabaseOptions } from '../../config/application-config.types.js';
import { DbConnection } from '../../config/config-enums.js';

const RUNTIME_ENTITY_GLOBS = ['dist/**/*.entity.js'];
// AI modified: Nest preserves the src/ prefix, so production must discover the emitted migrations there.
const RUNTIME_APPLICATION_MIGRATION_GLOBS = [
  'dist/src/infra/database/migrations/*.js',
];
const SOURCE_ENTITY_GLOBS = ['src/**/*.entity.ts'];
const SOURCE_APPLICATION_MIGRATION_GLOBS = [
  'src/infra/database/migrations/*.ts',
];

// AI modified: removing Demo discovery preserves production migration identities without touching existing databases.
function databaseMigrationGlobs(isCompiled: boolean): string[] {
  return [
    ...(isCompiled
      ? RUNTIME_APPLICATION_MIGRATION_GLOBS
      : SOURCE_APPLICATION_MIGRATION_GLOBS),
  ];
}

function databaseBooleanValue(
  name: string,
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  const lowerCaseValue = value.toLowerCase();

  if (lowerCaseValue === 'true') {
    return true;
  }

  if (lowerCaseValue === 'false') {
    return false;
  }

  throw new Error(`${name} must be true or false.`);
}

function getDatabaseEnvValue(key: string): string | undefined {
  return process.env[`DB_${key}`];
}

function databaseEnvValue(
  key: 'HOST' | 'USERNAME' | 'PASSWORD' | 'DATABASE',
  defaultValue: string,
  isProduction: boolean,
): string {
  const value = getDatabaseEnvValue(key);

  if (isProduction && (!value || value.trim().length === 0)) {
    throw new Error(`DB_${key} is required in production.`);
  }

  return value ?? defaultValue;
}

function databaseIntegerValue(
  key: 'PORT' | 'RETRY_ATTEMPTS' | 'RETRY_DELAY',
  defaultValue: number,
  minimum: number,
  maximum: number,
  isProduction: boolean = false,
): number {
  const value = getDatabaseEnvValue(key);

  if (isProduction && value === undefined) {
    throw new Error(`DB_${key} is required in production.`);
  }

  if (value === undefined) {
    return defaultValue;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(`DB_${key} must be an integer.`);
  }

  const integerValue = Number(value);

  if (
    !Number.isSafeInteger(integerValue) ||
    integerValue < minimum ||
    integerValue > maximum
  ) {
    throw new Error(`DB_${key} must be between ${minimum} and ${maximum}.`);
  }

  return integerValue;
}

function createDataSourceOptions(): DatabaseOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const synchronize = databaseBooleanValue(
    'DB_SYNCHRONIZE',
    getDatabaseEnvValue('SYNCHRONIZE'),
    false,
  );

  return {
    type: DbConnection.MYSQL,
    // AI modified: production DataSource creation fails closed even when the Nest config validator is bypassed by TypeORM CLI.
    host: databaseEnvValue('HOST', 'localhost', isProduction),
    port: databaseIntegerValue('PORT', 3306, 1, 65_535, isProduction),
    username: databaseEnvValue('USERNAME', 'root', isProduction),
    password: databaseEnvValue('PASSWORD', '', isProduction),
    database: databaseEnvValue('DATABASE', 'test', isProduction),
    entities: RUNTIME_ENTITY_GLOBS,
    migrations: databaseMigrationGlobs(true),
    synchronize: !isProduction && synchronize,
    autoLoadEntities: databaseBooleanValue(
      'DB_AUTO_LOAD_ENTITIES',
      getDatabaseEnvValue('AUTO_LOAD_ENTITIES'),
      true,
    ),
    retryAttempts: databaseIntegerValue('RETRY_ATTEMPTS', 10, 0, 100),
    retryDelay: databaseIntegerValue('RETRY_DELAY', 3000, 0, 300_000),
  };
}

export function createDatabaseOptions(): DatabaseOptions {
  return createDataSourceOptions();
}

// AI modified: ESM module URLs select emitted migrations without CommonJS filename globals.
export function createDatabaseCliOptions(
  isCompiled = import.meta.url.endsWith('.js'),
): DatabaseOptions {
  // AI modified: compiled TypeORM must never load source migrations beside emitted copies.
  const entities = isCompiled ? RUNTIME_ENTITY_GLOBS : SOURCE_ENTITY_GLOBS;
  const migrations = databaseMigrationGlobs(isCompiled);

  return {
    ...createDataSourceOptions(),
    entities,
    migrations,
  };
}

export const databaseConfig = registerAs('database', createDatabaseOptions);
