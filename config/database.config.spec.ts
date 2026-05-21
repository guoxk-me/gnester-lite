import { createDatabaseOptions } from './database.config';
import { DbConnection } from './config.types';

describe('databaseConfig', () => {
  const originalEnv = process.env;

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
    process.env.NODE_ENV = 'production';
    process.env.DB_SYNCHRONIZE = 'true';

    const config = createDatabaseOptions();

    expect(config.synchronize).toBe(false);
  });

  it('keeps TypeScript entity and migration globs out of runtime options', () => {
    const config = createDatabaseOptions();

    expect(config.entities).toEqual(['dist/**/*.entity.js']);
    expect(config.migrations).toEqual(['dist/migrations/*.js']);
  });

  it('keeps the database driver fixed to mysql', () => {
    process.env.DB_TYPE = 'sqlite';

    const config = createDatabaseOptions();

    expect(config.type).toBe(DbConnection.MYSQL);
    expect(config.name).toBeUndefined();
  });
});
