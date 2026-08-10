import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const allowedLoopbackHosts = new Set(['127.0.0.1', '::1', 'localhost']);

export function assertDisposableInfrastructure(environment) {
  if (environment.GNESTER_ALLOW_DESTRUCTIVE_INTEGRATION !== 'true') {
    throw new Error(
      'Set GNESTER_ALLOW_DESTRUCTIVE_INTEGRATION=true only for disposable local or CI infrastructure.',
    );
  }

  const databaseHost = environment.DB_HOST?.toLowerCase();
  const databasePort = environment.DB_PORT;
  const databaseUsername = environment.DB_USERNAME;
  const databasePassword = environment.DB_PASSWORD;
  const databaseName = environment.DB_DATABASE;
  const redisUrl = environment.REDIS_URL;

  if (!databaseHost || !allowedLoopbackHosts.has(databaseHost)) {
    throw new Error('Destructive integration requires a loopback DB_HOST.');
  }

  if (
    !databasePort ||
    !/^\d+$/.test(databasePort) ||
    Number(databasePort) < 1 ||
    Number(databasePort) > 65_535
  ) {
    throw new Error(
      'Destructive integration requires DB_PORT to be an integer between 1 and 65535.',
    );
  }

  if (!databaseUsername?.trim()) {
    throw new Error(
      'Destructive integration requires an explicit DB_USERNAME.',
    );
  }

  if (!databasePassword?.trim()) {
    throw new Error(
      'Destructive integration requires an explicit DB_PASSWORD.',
    );
  }

  if (!databaseName || !/(?:_|-)(?:test|ci)$/.test(databaseName)) {
    throw new Error(
      'Destructive integration requires DB_DATABASE to end in _test, -test, _ci, or -ci.',
    );
  }

  if (!redisUrl) {
    throw new Error('Destructive integration requires an explicit REDIS_URL.');
  }

  let redisEndpoint;

  try {
    redisEndpoint = new URL(redisUrl);
  } catch {
    // AI modified: URL parser errors retain their input and must not expose Redis credentials in CI logs.
    throw new Error(
      'Destructive integration requires a valid redis:// or rediss:// loopback URL.',
    );
  }

  // AI modified: WHATWG URL retains IPv6 brackets, while DB_HOST uses the bare loopback literal.
  const redisHostname = redisEndpoint.hostname
    .toLowerCase()
    .replace(/^\[(.*)]$/, '$1');

  if (
    !['redis:', 'rediss:'].includes(redisEndpoint.protocol) ||
    !allowedLoopbackHosts.has(redisHostname)
  ) {
    throw new Error(
      'Destructive integration requires a redis:// or rediss:// loopback URL.',
    );
  }
}

export function integrationEnvironment(environment) {
  return {
    ...environment,
    NODE_ENV: 'provision',
    CORS_ENABLED: 'false',
    CSRF_ENABLED: 'false',
    DB_AUTO_LOAD_ENTITIES: 'true',
    DB_SYNCHRONIZE: 'false',
    SENTRY_ENABLED: 'false',
    SESSION_ENABLED: 'false',
  };
}

export function productionVerificationEnvironment(environment) {
  return {
    ...integrationEnvironment(environment),
    // AI modified: the artifact smoke test must traverse production-only validation and assembly.
    NODE_ENV: 'production',
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  assertDisposableInfrastructure(process.env);
  const requestedVerification = process.argv[2];
  const childEnvironment = integrationEnvironment(process.env);

  switch (requestedVerification) {
    case 'migrations':
      runNode(
        [
          'node_modules/typeorm/cli.js',
          '-d',
          'dist/config/typeorm.data-source.js',
          'migration:run',
        ],
        childEnvironment,
      );
      runNode(
        [
          'node_modules/typeorm/cli.js',
          '-d',
          'dist/config/typeorm.data-source.js',
          'migration:revert',
        ],
        childEnvironment,
      );
      runNode(
        [
          'node_modules/typeorm/cli.js',
          '-d',
          'dist/config/typeorm.data-source.js',
          'migration:run',
        ],
        childEnvironment,
      );
      break;
    case 'full-app':
      runNode(
        [
          'node_modules/jest/bin/jest.js',
          '--config',
          './test/jest-full-app.json',
          '--runInBand',
        ],
        childEnvironment,
      );
      break;
    case 'production-start':
      runNode(
        ['scripts/verify-production-start.mjs'],
        productionVerificationEnvironment(process.env),
      );
      break;
    default:
      throw new Error(
        'Expected verification target "migrations", "full-app", or "production-start".',
      );
  }
}

function runNode(arguments_, childEnvironment) {
  const execution = spawnSync(process.execPath, arguments_, {
    env: {
      ...childEnvironment,
      NODE_OPTIONS: [childEnvironment.NODE_OPTIONS, '--experimental-vm-modules']
        .filter(Boolean)
        .join(' '),
    },
    stdio: 'inherit',
  });

  if (execution.error) {
    throw execution.error;
  }

  if (execution.status !== 0) {
    process.exit(execution.status ?? 1);
  }
}
