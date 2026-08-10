import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  createDatabaseCliOptions,
  createDatabaseOptions,
} from './database.config';
import { DbConnection } from './config.types';
import { loadProjectEnvironmentFiles } from './environment-files';

describe('databaseConfig', () => {
  const originalEnv = process.env;

  function configureProductionDatabase(): void {
    process.env = {
      NODE_ENV: 'production',
      DB_HOST: 'database.internal',
      DB_PORT: '3306',
      DB_USERNAME: 'application',
      DB_PASSWORD: 'runtime-only-password',
      DB_DATABASE: 'application',
    };
  }

  beforeEach(() => {
    jest.resetModules();
    process.env = { NODE_ENV: 'development' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('enables auto-loaded entities by default', () => {
    const config = createDatabaseOptions();

    expect(config.autoLoadEntities).toBe(true);
  });

  it('keeps synchronize disabled in production even when requested', () => {
    configureProductionDatabase();
    process.env.DB_SYNCHRONIZE = 'true';

    const config = createDatabaseOptions();

    expect(config.synchronize).toBe(false);
  });

  it('keeps TypeScript entity and migration globs out of runtime options', () => {
    const config = createDatabaseOptions();

    expect(config.entities).toEqual(['dist/**/*.entity.js']);
    expect(config.migrations).toEqual([
      'dist/src/migrations/*.js',
      'dist/src/examples/demo-database/migrations/*.js',
    ]);
  });

  it('uses source-only globs for the ts-node TypeORM data source', () => {
    const config = createDatabaseCliOptions(false);

    expect(config.entities).toEqual(['src/**/*.entity.ts']);
    expect(config.migrations).toEqual([
      'src/migrations/*.ts',
      'src/examples/demo-database/migrations/*.ts',
    ]);
  });

  it('uses emitted-only globs for the compiled TypeORM data source', () => {
    const config = createDatabaseCliOptions(true);

    expect(config.entities).toEqual(['dist/**/*.entity.js']);
    expect(config.migrations).toEqual([
      'dist/src/migrations/*.js',
      'dist/src/examples/demo-database/migrations/*.js',
    ]);
  });

  it('excludes Demo migrations from every production data source mode', () => {
    configureProductionDatabase();

    expect(createDatabaseOptions().migrations).toEqual([
      'dist/src/migrations/*.js',
    ]);
    expect(createDatabaseCliOptions(false).migrations).toEqual([
      'src/migrations/*.ts',
    ]);
    expect(createDatabaseCliOptions(true).migrations).toEqual([
      'dist/src/migrations/*.js',
    ]);
  });

  it('includes Demo migrations in the guarded provision environment', () => {
    process.env.NODE_ENV = 'provision';

    expect(createDatabaseCliOptions(true).migrations).toEqual([
      'dist/src/migrations/*.js',
      'dist/src/examples/demo-database/migrations/*.js',
    ]);
  });

  it('keeps the database driver fixed to mysql', () => {
    process.env.DB_TYPE = 'sqlite';

    const config = createDatabaseOptions();

    expect(config.type).toBe(DbConnection.MYSQL);
    expect(config.name).toBeUndefined();
  });

  it.each(['HOST', 'PORT', 'USERNAME', 'PASSWORD', 'DATABASE'])(
    'fails closed when production DB_%s is missing',
    (key) => {
      configureProductionDatabase();
      delete process.env[`DB_${key}`];

      expect(() => createDatabaseCliOptions(true)).toThrow(
        `DB_${key} is required in production.`,
      );
    },
  );

  it('rejects malformed numeric and boolean database values without truncation', () => {
    process.env.DB_PORT = '3306.5';
    expect(() => createDatabaseOptions()).toThrow(
      'DB_PORT must be an integer.',
    );

    process.env.DB_PORT = '3306';
    process.env.DB_AUTO_LOAD_ENTITIES = 'sometimes';
    expect(() => createDatabaseOptions()).toThrow(
      'DB_AUTO_LOAD_ENTITIES must be true or false.',
    );
  });

  it('uses identical credentials for source and compiled CLI modes', () => {
    process.env.DB_HOST = 'database.internal';
    process.env.DB_PORT = '3307';
    process.env.DB_USERNAME = 'application';
    process.env.DB_PASSWORD = 'runtime-only-password';
    process.env.DB_DATABASE = 'application';

    const sourceOptions = createDatabaseCliOptions(false);
    const compiledOptions = createDatabaseCliOptions(true);

    expect(sourceOptions).toMatchObject({
      host: compiledOptions.host,
      port: compiledOptions.port,
      username: compiledOptions.username,
      password: compiledOptions.password,
      database: compiledOptions.database,
    });
  });

  it('applies one dotenv precedence contract to source and compiled CLI modes without connecting', () => {
    const projectDirectory = mkdtempSync(
      join(tmpdir(), 'gnester-database-cli-'),
    );
    const loadEnvironmentFile = (environmentFilePath: string): void => {
      for (const environmentEntry of readFileSync(environmentFilePath, 'utf8')
        .trim()
        .split('\n')) {
        const separatorIndex = environmentEntry.indexOf('=');
        const environmentKey = environmentEntry.slice(0, separatorIndex);

        process.env[environmentKey] ??= environmentEntry.slice(
          separatorIndex + 1,
        );
      }
    };

    try {
      writeFileSync(
        join(projectDirectory, '.env.development.local'),
        [
          'DB_HOST=local.database.internal',
          'DB_PORT=3307',
          'DB_USERNAME=local-application',
          'DB_PASSWORD=local-runtime-password',
          'DB_DATABASE=local-application',
        ].join('\n'),
      );
      writeFileSync(
        join(projectDirectory, '.env.development'),
        [
          'DB_HOST=shared.database.internal',
          'DB_PORT=3306',
          'DB_USERNAME=shared-application',
          'DB_PASSWORD=shared-runtime-password',
          'DB_DATABASE=shared-application',
        ].join('\n'),
      );

      loadProjectEnvironmentFiles(
        projectDirectory,
        'development',
        loadEnvironmentFile,
      );

      const sourceOptions = createDatabaseCliOptions(false);
      const compiledOptions = createDatabaseCliOptions(true);

      expect(sourceOptions).toMatchObject({
        host: 'local.database.internal',
        port: 3307,
        username: 'local-application',
        password: 'local-runtime-password',
        database: 'local-application',
      });
      expect(compiledOptions).toMatchObject({
        host: sourceOptions.host,
        port: sourceOptions.port,
        username: sourceOptions.username,
        password: sourceOptions.password,
        database: sourceOptions.database,
      });
    } finally {
      rmSync(projectDirectory, { recursive: true, force: true });
    }
  });
});
