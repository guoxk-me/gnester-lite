import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

interface PackageJson {
  readonly scripts: Record<string, string>;
}

interface NestCliConfiguration {
  readonly compilerOptions: {
    readonly plugins: ReadonlyArray<
      | string
      | {
          readonly name: string;
          readonly options?: Record<string, unknown>;
        }
    >;
  };
}

function readPackageJson(): PackageJson {
  return JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
  ) as PackageJson;
}

function activeEnvironmentValue(
  fileName: string,
  variableName: string,
): string | undefined {
  const environmentFile = readFileSync(join(__dirname, '..', fileName), 'utf8');
  const prefix = `${variableName}=`;
  const entry = environmentFile
    .split(/\r?\n/)
    .find((line) => line.startsWith(prefix));

  return entry?.slice(prefix.length);
}

describe('template delivery contracts', () => {
  it('starts production from the actual Nest build output path', () => {
    const packageJson = readPackageJson();

    expect(packageJson.scripts['start:prod']).toBe(
      'NODE_ENV=production node dist/src/main.js',
    );
  });

  it('forces production mode for compiled migration commands', () => {
    const packageJson = readPackageJson();

    expect(packageJson.scripts['migration:run:prod']).toMatch(
      /^NODE_ENV=production /,
    );
    expect(packageJson.scripts['migration:revert:prod']).toMatch(
      /^NODE_ENV=production /,
    );
  });

  it('ships clone-ready Docker and CI entrypoints', () => {
    const rootDir = join(__dirname, '..');

    expect(existsSync(join(rootDir, 'Dockerfile'))).toBe(true);
    expect(existsSync(join(rootDir, 'docker-compose.yml'))).toBe(true);
    expect(existsSync(join(rootDir, '.github/workflows/ci.yml'))).toBe(true);
  });

  it('does not ship active reusable secrets or production credentials', () => {
    for (const variableName of [
      'BETTER_AUTH_SECRET',
      'JWT_SECRET',
      'CSRF_SECRET',
      'ENCRYPTION_KEY',
      'HMAC_SECRET',
    ]) {
      expect(
        activeEnvironmentValue('.env.example', variableName),
      ).toBeUndefined();
    }

    expect(activeEnvironmentValue('.env.production', 'DB_PASSWORD')).toBe('');
  });

  // AI modified: lock metadata integration details that otherwise fail as empty OpenAPI schemas.
  it('uses the Swagger package key for SWC metadata generation', () => {
    const nestCliConfiguration = JSON.parse(
      readFileSync(join(__dirname, '..', 'nest-cli.json'), 'utf8'),
    ) as NestCliConfiguration;
    const swaggerPlugin = nestCliConfiguration.compilerOptions.plugins.find(
      (plugin) =>
        typeof plugin === 'object' && plugin.name === '@nestjs/swagger',
    );

    expect(swaggerPlugin).toEqual({
      name: '@nestjs/swagger',
      options: {
        classValidatorShim: true,
        introspectComments: true,
      },
    });
  });

  it.each([
    'src/examples/demo-cache/dto/update-demo-cache.dto.ts',
    'src/examples/demo-database/dto/demo-mapped-types.dto.ts',
    'src/examples/demo-database/dto/update-demo.dto.ts',
  ])('uses Swagger-aware mapped types in %s', (relativePath) => {
    const source = readFileSync(join(__dirname, '..', relativePath), 'utf8');

    expect(source).toContain("from '@nestjs/swagger'");
    expect(source).not.toContain("from '@nestjs/mapped-types'");
  });
});
