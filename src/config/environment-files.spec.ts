import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  environmentFilePaths,
  loadProjectEnvironmentFiles,
  sentryBootstrapEnvironment,
  shouldInitializeSentry,
} from './environment-files';

describe('environment files', () => {
  const precedenceKey = 'GNESTER_ENV_LOADER_PRECEDENCE';
  const runtimeKey = 'GNESTER_ENV_LOADER_RUNTIME';
  const originalPrecedence = process.env[precedenceKey];
  const originalRuntime = process.env[runtimeKey];

  afterEach(() => {
    if (originalPrecedence === undefined) {
      delete process.env[precedenceKey];
    } else {
      process.env[precedenceKey] = originalPrecedence;
    }

    if (originalRuntime === undefined) {
      delete process.env[runtimeKey];
    } else {
      process.env[runtimeKey] = originalRuntime;
    }
  });

  it('orders local environment overrides before shared defaults', () => {
    expect(environmentFilePaths('production')).toEqual([
      '.env.production.local',
      '.env.production',
      '.env.local',
      '.env',
    ]);
  });

  it('rejects an unsupported NODE_ENV before invoking the file loader', () => {
    const loadEnvironmentFile = jest.fn<void, [string]>();

    expect(() =>
      loadProjectEnvironmentFiles(
        join(tmpdir(), 'gnester-environment-audit'),
        '../../../outside',
        loadEnvironmentFile,
      ),
    ).toThrow('NODE_ENV must be development, production, test, or provision.');
    expect(loadEnvironmentFile).not.toHaveBeenCalled();
  });

  it('preserves runtime values and the first file value', () => {
    const projectDirectory = mkdtempSync(
      join(tmpdir(), 'gnester-environment-files-'),
    );

    try {
      writeFileSync(
        join(projectDirectory, '.env.production.local'),
        `${precedenceKey}=local\n${runtimeKey}=file\n`,
      );
      writeFileSync(
        join(projectDirectory, '.env.production'),
        `${precedenceKey}=shared\n`,
      );
      delete process.env[precedenceKey];
      process.env[runtimeKey] = 'runtime';
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

      expect(
        loadProjectEnvironmentFiles(
          projectDirectory,
          'production',
          loadEnvironmentFile,
        ),
      ).toEqual(['.env.production.local', '.env.production']);
      expect(process.env[precedenceKey]).toBe('local');
      expect(process.env[runtimeKey]).toBe('runtime');
    } finally {
      rmSync(projectDirectory, { recursive: true, force: true });
    }
  });

  it('uses the validator boolean and sample-rate contract before Sentry starts', () => {
    expect(
      sentryBootstrapEnvironment({
        NODE_ENV: 'production',
        SENTRY_ENABLED: 'FALSE',
        SENTRY_TRACES_SAMPLE_RATE: '0.25',
      }),
    ).toEqual({
      isEnabled: false,
      tracesSampleRate: 0.25,
    });

    expect(() =>
      sentryBootstrapEnvironment({
        SENTRY_ENABLED: 'true',
        SENTRY_TRACES_SAMPLE_RATE: 'NaN',
      }),
    ).toThrow(
      'SENTRY_TRACES_SAMPLE_RATE must be a finite number between 0 and 1.',
    );
    expect(
      shouldInitializeSentry(
        'provision',
        'https://public@example.ingest.sentry.io/1',
        true,
      ),
    ).toBe(false);
  });

  it('treats a blank sample rate as absent during early bootstrap', () => {
    expect(
      sentryBootstrapEnvironment({
        NODE_ENV: 'production',
        SENTRY_TRACES_SAMPLE_RATE: '   ',
      }),
    ).toEqual({
      isEnabled: true,
      tracesSampleRate: 0.1,
    });
  });
});
