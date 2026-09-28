import { existsSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { loadEnvFile } from 'node:process';

import { Environment } from './config.types';

export interface SentryBootstrapEnvironment {
  readonly isEnabled: boolean;
  readonly tracesSampleRate: number;
}

const supportedEnvironments = new Set<string>(Object.values(Environment));

export function environmentBooleanValue(value: unknown): unknown {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lowercaseValue = value.toLowerCase();

    if (lowercaseValue === 'true') {
      return true;
    }

    if (lowercaseValue === 'false') {
      return false;
    }
  }

  return value;
}

export function sentryBootstrapEnvironment(
  environment: NodeJS.ProcessEnv,
): SentryBootstrapEnvironment {
  const isSentryEnabled = environmentBooleanValue(
    environment.SENTRY_ENABLED ?? true,
  );

  if (typeof isSentryEnabled !== 'boolean') {
    throw new Error('SENTRY_ENABLED must be true or false.');
  }

  const defaultSampleRate = environment.NODE_ENV === 'production' ? 0.1 : 1;
  const configuredSampleRate = environment.SENTRY_TRACES_SAMPLE_RATE;
  const tracesSampleRate =
    configuredSampleRate === undefined || configuredSampleRate.trim() === ''
      ? defaultSampleRate
      : Number(configuredSampleRate);

  if (
    !Number.isFinite(tracesSampleRate) ||
    tracesSampleRate < 0 ||
    tracesSampleRate > 1
  ) {
    throw new Error(
      'SENTRY_TRACES_SAMPLE_RATE must be a finite number between 0 and 1.',
    );
  }

  return {
    isEnabled: isSentryEnabled,
    tracesSampleRate,
  };
}

export function shouldInitializeSentry(
  nodeEnv: string,
  sentryDsn: string | undefined,
  isEnabled: boolean,
): boolean {
  return (
    Boolean(sentryDsn) &&
    isEnabled &&
    nodeEnv !== 'test' &&
    nodeEnv !== 'provision'
  );
}

export function environmentFilePaths(
  nodeEnv: string = process.env.NODE_ENV ?? 'development',
): string[] {
  // AI modified: reject untrusted path segments before NODE_ENV participates in dotenv discovery.
  if (!supportedEnvironments.has(nodeEnv)) {
    throw new Error(
      'NODE_ENV must be development, production, test, or provision.',
    );
  }

  return [`.env.${nodeEnv}.local`, `.env.${nodeEnv}`, '.env.local', '.env'];
}

export function loadProjectEnvironmentFiles(
  projectDirectory: string = process.cwd(),
  nodeEnv: string = process.env.NODE_ENV ?? 'development',
  loadEnvironmentFile: (path: string) => void = loadEnvFile,
): string[] {
  const loadedEnvironmentFiles: string[] = [];
  const projectRoot = resolve(projectDirectory);

  // AI modified: Node preserves existing keys, so load highest-priority files first.
  for (const environmentFile of environmentFilePaths(nodeEnv)) {
    const environmentFilePath = resolve(projectRoot, environmentFile);
    const projectRelativePath = relative(projectRoot, environmentFilePath);

    // AI modified: keep every resolved candidate inside the selected project root.
    if (
      projectRelativePath === '..' ||
      projectRelativePath.startsWith(`..${sep}`) ||
      isAbsolute(projectRelativePath)
    ) {
      throw new Error(
        'Environment file paths must remain within the project directory.',
      );
    }

    if (!existsSync(environmentFilePath)) {
      continue;
    }

    loadEnvironmentFile(environmentFilePath);
    loadedEnvironmentFiles.push(environmentFile);
  }

  return loadedEnvironmentFiles;
}
