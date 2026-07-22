// CN: 测试文件，验证 configuration 的行为契约；EN: Test file verifies behavior contracts for configuration.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

interface PackageJson {
  readonly scripts: Record<string, string>;
}

// CN: 生成或校验 configuration 的 read package json 配置；EN: Builds or validates the read package json configuration for configuration.
function readPackageJson(): PackageJson {
  return JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
  ) as PackageJson;
}

// CN: 测试分组：template delivery contracts；EN: Test group: template delivery contracts.
describe('template delivery contracts', () => {
  // CN: 测试用例：starts production from the actual Nest build output path；EN: Test case: starts production from the actual Nest build output path.
  it('starts production from the actual Nest build output path', () => {
    const packageJson = readPackageJson();

    expect(packageJson.scripts['start:prod']).toBe(
      'NODE_ENV=production node dist/src/main.js',
    );
  });

  // CN: 测试用例：ships clone-ready Docker and CI entrypoints；EN: Test case: ships clone-ready Docker and CI entrypoints.
  it('ships clone-ready Docker and CI entrypoints', () => {
    const rootDir = join(__dirname, '..');

    expect(existsSync(join(rootDir, 'Dockerfile'))).toBe(true);
    expect(existsSync(join(rootDir, 'docker-compose.yml'))).toBe(true);
    expect(existsSync(join(rootDir, '.github/workflows/ci.yml'))).toBe(true);
  });
});
