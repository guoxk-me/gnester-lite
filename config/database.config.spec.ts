// CN: 测试文件，验证 configuration 的行为契约；EN: Test file verifies behavior contracts for configuration.
import { createDatabaseOptions } from './database.config';
import { DbConnection } from './config.types';

// CN: 测试分组：databaseConfig；EN: Test group: databaseConfig.
describe('databaseConfig', () => {
  const originalEnv = process.env;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    jest.resetModules();
    process.env = { NODE_ENV: 'development' };
  });

  // CN: 测试用例，组织或验证测试流程；EN: Test case organizes or verifies the test flow.
  afterAll(() => {
    process.env = originalEnv;
  });

  // CN: 测试用例：enables auto-loaded entities by default；EN: Test case: enables auto-loaded entities by default.
  it('enables auto-loaded entities by default', () => {
    const config = createDatabaseOptions();

    expect(config.autoLoadEntities).toBe(true);
  });

  // CN: 测试用例：keeps synchronize disabled in production even when requested；EN: Test case: keeps synchronize disabled in production even when requested.
  it('keeps synchronize disabled in production even when requested', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_SYNCHRONIZE = 'true';

    const config = createDatabaseOptions();

    expect(config.synchronize).toBe(false);
  });

  // CN: 测试用例：keeps TypeScript entity and migration globs out of runtime options；EN: Test case: keeps TypeScript entity and migration globs out of runtime options.
  it('keeps TypeScript entity and migration globs out of runtime options', () => {
    const config = createDatabaseOptions();

    expect(config.entities).toEqual(['dist/**/*.entity.js']);
    expect(config.migrations).toEqual(['dist/migrations/*.js']);
  });

  // CN: 测试用例：keeps the database driver fixed to mysql；EN: Test case: keeps the database driver fixed to mysql.
  it('keeps the database driver fixed to mysql', () => {
    process.env.DB_TYPE = 'sqlite';

    const config = createDatabaseOptions();

    expect(config.type).toBe(DbConnection.MYSQL);
    expect(config.name).toBeUndefined();
  });
});
