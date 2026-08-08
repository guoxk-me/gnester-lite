import { execFileSync } from 'node:child_process';

const imageName = process.argv[2] ?? 'gnester-lite:ci';
const imageUser = execFileSync(
  'docker',
  ['image', 'inspect', '--format', '{{.Config.User}}', imageName],
  { encoding: 'utf8' },
).trim();

if (imageUser === '' || imageUser === '0' || imageUser === 'root') {
  throw new Error(
    `Production image must use a non-root user; found "${imageUser}".`,
  );
}

const imageHealthcheck = JSON.parse(
  execFileSync(
    'docker',
    ['image', 'inspect', '--format', '{{json .Config.Healthcheck}}', imageName],
    { encoding: 'utf8' },
  ),
);

if (!imageHealthcheck?.Test || imageHealthcheck.Test.length === 0) {
  throw new Error('Production image must declare a container healthcheck.');
}

const healthcheckCommand = imageHealthcheck.Test.join(' ');

if (
  !healthcheckCommand.includes('process.env.PORT') ||
  !healthcheckCommand.includes('/health/ready')
) {
  throw new Error(
    'Production healthcheck must use PORT and the readiness endpoint.',
  );
}

// AI modified: the image retains the opt-in Demo migration for guarded provision verification.
const requiredPaths = [
  '/app/dist/src/main.js',
  '/app/dist/config/typeorm.data-source.js',
  '/app/dist/src/migrations/1785801600000-CreateBetterAuthTables.js',
  '/app/dist/src/platform/security/better-auth/better-auth.loader.cjs',
  '/app/dist/src/examples/demo-database/migrations/1760000000000-CreateDemoTable.js',
  '/app/node_modules/typeorm/cli.js',
];
const forbiddenPaths = [
  '/app/dist/src/migrations/1760000000000-CreateDemoTable.js',
];
const fileAssertion = [
  "const { existsSync, statSync } = require('node:fs');",
  `const requiredPaths = ${JSON.stringify(requiredPaths)};`,
  `const forbiddenPaths = ${JSON.stringify(forbiddenPaths)};`,
  'const missingPaths = requiredPaths.filter((path) => !existsSync(path));',
  "if (missingPaths.length > 0) throw new Error(`Missing image files: ${missingPaths.join(', ')}`);",
  'const unexpectedPaths = forbiddenPaths.filter((path) => existsSync(path));',
  "if (unexpectedPaths.length > 0) throw new Error(`Image contains retired migration paths: ${unexpectedPaths.join(', ')}`);",
  'const mutableAssets = requiredPaths.filter((path) => { const stats = statSync(path); return stats.uid !== 0 || (stats.mode & 0o022) !== 0; });',
  "if (mutableAssets.length > 0) throw new Error(`Runtime assets must be root-owned and immutable to the node user: ${mutableAssets.join(', ')}`);",
].join('\n');

execFileSync(
  'docker',
  ['run', '--rm', '--entrypoint', 'node', imageName, '-e', fileAssertion],
  { stdio: 'inherit' },
);
execFileSync(
  'docker',
  [
    'run',
    '--rm',
    '--entrypoint',
    'node',
    imageName,
    'node_modules/typeorm/cli.js',
    '--help',
  ],
  { stdio: 'ignore' },
);
