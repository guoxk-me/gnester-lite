import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';

import { MODULE_METADATA } from '@nestjs/common/constants.js';
import ts from 'typescript';

const projectRoot = process.cwd();
const sourceRoot = resolve(projectRoot, 'src');
const contractsRoot = resolve(sourceRoot, 'contracts');
const examplesRoot = resolve(sourceRoot, 'examples');
const bootstrapRoot = resolve(sourceRoot, 'bootstrap');
const legacyCommonRoot = resolve(sourceRoot, 'common');
const legacyPlatformRoot = resolve(sourceRoot, 'platform');
const legacyFeaturesRoot = resolve(sourceRoot, 'features');
const architectureViolations = [];
const capabilityNames = [
  'auth',
  'authorization',
  'better-auth',
  'cache',
  'crypto',
  'csrf',
  'health',
  'http-client',
  'i18n',
  'logger',
  'queue',
  'rate-limit',
  'schedule',
  'sentry',
];
const capabilityRoots = capabilityNames.map((name) =>
  resolve(sourceRoot, name),
);
const reservedDirectoryNames = new Set([
  ...capabilityNames,
  'bootstrap',
  'config',
  'contracts',
  'database',
  'examples',
  'common',
  'platform',
  'features',
]);

const capabilityContracts = [
  {
    consumerPath: 'dist/src/health/health.module.js',
    consumerExport: 'HealthModule',
    requiredImports: ['CacheModule'],
  },
  {
    consumerPath: 'dist/src/examples/demo-auth/demo-auth.module.js',
    consumerExport: 'DemoAuthModule',
    requiredImports: ['AuthModule'],
  },
  {
    consumerPath:
      'dist/src/examples/demo-authorization/demo-authorization.module.js',
    consumerExport: 'DemoAuthorizationModule',
    requiredImports: ['AuthModule', 'AuthorizationModule'],
  },
  {
    consumerPath: 'dist/src/examples/demo-cache/demo-cache.module.js',
    consumerExport: 'DemoCacheModule',
    requiredImports: ['CacheModule'],
  },
  {
    consumerPath: 'dist/src/examples/demo-crypto/demo-crypto.module.js',
    consumerExport: 'DemoCryptoModule',
    requiredImports: ['CryptoModule'],
  },
  {
    consumerPath: 'dist/src/examples/demo-csrf/demo-csrf.module.js',
    consumerExport: 'DemoCsrfModule',
    requiredImports: ['CsrfModule'],
  },
  {
    consumerPath: 'dist/src/examples/demo-events/demo-events.module.js',
    consumerExport: 'DemoEventsModule',
    requiredImports: ['EventEmitterModule'],
  },
  {
    consumerPath: 'dist/src/examples/demo-http/demo-http.module.js',
    consumerExport: 'DemoHttpModule',
    requiredImports: ['HttpClientModule'],
  },
  {
    consumerPath: 'dist/src/examples/demo-queue/demo-queue.module.js',
    consumerExport: 'DemoQueueModule',
    requiredImports: ['QueueModule'],
  },
  {
    consumerPath: 'dist/src/examples/demo-schedule/demo-schedule.module.js',
    consumerExport: 'DemoScheduleModule',
    requiredImports: ['ScheduleModule'],
  },
  {
    consumerPath: 'dist/src/examples/demo-websocket/demo-websocket.module.js',
    consumerExport: 'DemoWebsocketModule',
    requiredImports: ['AuthModule'],
  },
];

const productionForbiddenModules = new Set([
  'AuthModule',
  'AuthorizationModule',
  'CryptoModule',
  'HttpClientModule',
  'QueueModule',
  'ScheduleModule',
  'EventEmitterModule',
]);
const demoDatabaseMigrationGlob =
  'dist/src/examples/demo-database/migrations/*.js';

function isInside(candidatePath, expectedRoot) {
  return (
    candidatePath === expectedRoot ||
    candidatePath.startsWith(`${expectedRoot}${sep}`)
  );
}

async function listTypeScriptFiles(directory) {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (failure) {
    if (failure && typeof failure === 'object' && failure.code === 'ENOENT') {
      return [];
    }

    throw failure;
  }

  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve(directory, entry.name);

      if (entry.isDirectory()) {
        return listTypeScriptFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith('.ts') ? [entryPath] : [];
    }),
  );

  return nestedFiles.flat();
}

function moduleSpecifiers(sourceFile) {
  const specifiers = [];

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }

    if (
      ts.isCallExpression(node) &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require'))
    ) {
      specifiers.push(node.arguments[0].text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

async function verifySourceBoundaries() {
  const sourceEntries = await readdir(sourceRoot, { withFileTypes: true });
  const featureRoots = sourceEntries
    .filter(
      (entry) => entry.isDirectory() && !reservedDirectoryNames.has(entry.name),
    )
    .map((entry) => resolve(sourceRoot, entry.name));
  const capabilityFileGroups = await Promise.all(
    capabilityRoots.map((root) => listTypeScriptFiles(root)),
  );
  // AI modified: require every capability to be scanned after flattening the old platform tree.
  for (const [index, files] of capabilityFileGroups.entries()) {
    if (files.length === 0) {
      architectureViolations.push(
        `src/${capabilityNames[index]} has no TypeScript files`,
      );
    }
  }
  const capabilityFiles = capabilityFileGroups.flat();

  for (const capabilityFile of capabilityFiles) {
    const sourceText = await readFile(capabilityFile, 'utf8');
    const sourceFile = ts.createSourceFile(
      capabilityFile,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
    );

    // AI modified: capability dependencies stay explicit instead of becoming invisible application globals.
    if (/@Global\s*\(/u.test(sourceText)) {
      architectureViolations.push(
        `${relative(projectRoot, capabilityFile)} uses @Global()`,
      );
    }

    for (const moduleSpecifier of moduleSpecifiers(sourceFile)) {
      if (!moduleSpecifier.startsWith('.')) {
        continue;
      }

      const dependencyPath = resolve(dirname(capabilityFile), moduleSpecifier);

      // AI modified: reusable capabilities must not depend on business or demo modules.
      if (
        featureRoots.some((root) => isInside(dependencyPath, root)) ||
        isInside(dependencyPath, examplesRoot) ||
        isInside(dependencyPath, bootstrapRoot)
      ) {
        architectureViolations.push(
          `${relative(projectRoot, capabilityFile)} imports an application layer ${moduleSpecifier}`,
        );
      }
    }
  }

  const featureFiles = (
    await Promise.all(featureRoots.map((root) => listTypeScriptFiles(root)))
  ).flat();

  for (const featureFile of featureFiles) {
    const sourceText = await readFile(featureFile, 'utf8');
    const sourceFile = ts.createSourceFile(
      featureFile,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
    );

    for (const moduleSpecifier of moduleSpecifiers(sourceFile)) {
      if (!moduleSpecifier.startsWith('.')) {
        continue;
      }

      const dependencyPath = resolve(dirname(featureFile), moduleSpecifier);

      const importsAnotherFeature = featureRoots.some(
        (root) =>
          isInside(dependencyPath, root) && !isInside(featureFile, root),
      );

      if (
        importsAnotherFeature ||
        isInside(dependencyPath, examplesRoot) ||
        isInside(dependencyPath, bootstrapRoot)
      ) {
        architectureViolations.push(
          `${relative(projectRoot, featureFile)} imports another feature or a non-production layer ${moduleSpecifier}`,
        );
      }
    }
  }

  const exampleFiles = await listTypeScriptFiles(examplesRoot);

  for (const exampleFile of exampleFiles) {
    const sourceText = await readFile(exampleFile, 'utf8');
    const sourceFile = ts.createSourceFile(
      exampleFile,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
    );

    for (const moduleSpecifier of moduleSpecifiers(sourceFile)) {
      if (!moduleSpecifier.startsWith('.')) {
        continue;
      }

      const dependencyPath = resolve(dirname(exampleFile), moduleSpecifier);

      if (
        featureRoots.some((root) => isInside(dependencyPath, root)) ||
        isInside(dependencyPath, bootstrapRoot)
      ) {
        architectureViolations.push(
          `${relative(projectRoot, exampleFile)} imports production behavior ${moduleSpecifier}`,
        );
      }
    }
  }

  const bootstrapFiles = await listTypeScriptFiles(bootstrapRoot);

  for (const bootstrapFile of bootstrapFiles) {
    const sourceText = await readFile(bootstrapFile, 'utf8');
    const sourceFile = ts.createSourceFile(
      bootstrapFile,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
    );

    for (const moduleSpecifier of moduleSpecifiers(sourceFile)) {
      if (!moduleSpecifier.startsWith('.')) {
        continue;
      }

      const dependencyPath = resolve(dirname(bootstrapFile), moduleSpecifier);

      if (
        featureRoots.some((root) => isInside(dependencyPath, root)) ||
        isInside(dependencyPath, examplesRoot)
      ) {
        architectureViolations.push(
          `${relative(projectRoot, bootstrapFile)} imports application behavior ${moduleSpecifier}`,
        );
      }
    }
  }

  const contractFiles = await listTypeScriptFiles(contractsRoot);

  for (const contractFile of contractFiles) {
    const sourceText = await readFile(contractFile, 'utf8');
    const sourceFile = ts.createSourceFile(
      contractFile,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
    );

    for (const moduleSpecifier of moduleSpecifiers(sourceFile)) {
      if (moduleSpecifier.startsWith('node:')) {
        continue;
      }

      const isInternalContract =
        moduleSpecifier.startsWith('.') &&
        isInside(
          resolve(dirname(contractFile), moduleSpecifier),
          contractsRoot,
        );

      if (!isInternalContract) {
        architectureViolations.push(
          `${relative(projectRoot, contractFile)} imports non-contract ${moduleSpecifier}`,
        );
      }
    }
  }

  const legacyCommonFiles = await listTypeScriptFiles(legacyCommonRoot);
  const legacyPlatformFiles = await listTypeScriptFiles(legacyPlatformRoot);
  const legacyFeaturesFiles = await listTypeScriptFiles(legacyFeaturesRoot);

  for (const legacyCommonFile of [
    ...legacyCommonFiles,
    ...legacyPlatformFiles,
    ...legacyFeaturesFiles,
  ]) {
    architectureViolations.push(
      `${relative(projectRoot, legacyCommonFile)} remains in a retired source layer`,
    );
  }

  return (
    capabilityFiles.length +
    featureFiles.length +
    exampleFiles.length +
    bootstrapFiles.length +
    contractFiles.length
  );
}

function importedModuleName(moduleImport) {
  if (typeof moduleImport === 'function') {
    return moduleImport.name;
  }

  if (
    typeof moduleImport === 'object' &&
    moduleImport !== null &&
    'module' in moduleImport &&
    typeof moduleImport.module === 'function'
  ) {
    return moduleImport.module.name;
  }

  return undefined;
}

async function importCompiledModule(modulePath, exportName) {
  const moduleUrl = pathToFileURL(resolve(projectRoot, modulePath)).href;
  const moduleExports = await import(moduleUrl);
  // AI modified: SWC CommonJS getters can be exposed through Node's default interop namespace.
  const moduleType =
    moduleExports[exportName] ??
    moduleExports.default?.[exportName] ??
    moduleExports['module.exports']?.[exportName];

  if (typeof moduleType !== 'function') {
    throw new Error(`${modulePath} does not export ${exportName}`);
  }

  return moduleType;
}

function databaseMigrationGlobs(databaseOptions, contractName) {
  if (
    !databaseOptions ||
    typeof databaseOptions !== 'object' ||
    !Array.isArray(databaseOptions.migrations) ||
    !databaseOptions.migrations.every(
      (migrationGlob) => typeof migrationGlob === 'string',
    )
  ) {
    architectureViolations.push(
      `${contractName} must expose migrations as a string array`,
    );
    return [];
  }

  return databaseOptions.migrations;
}

async function verifyMigrationOwnership() {
  Object.assign(process.env, productionEnvironment());
  const createDatabaseOptions = await importCompiledModule(
    'dist/src/config/database.config.js',
    'createDatabaseOptions',
  );
  const createDatabaseCliOptions = await importCompiledModule(
    'dist/src/config/database.config.js',
    'createDatabaseCliOptions',
  );
  const migrationContracts = [
    {
      environment: 'production',
      shouldIncludeDemoMigration: false,
    },
    {
      environment: 'provision',
      shouldIncludeDemoMigration: true,
    },
  ];
  let checkedMigrationContractCount = 0;

  // AI modified: production stays feature-neutral while provisioning explicitly opts into Demo schema.
  for (const migrationContract of migrationContracts) {
    process.env.NODE_ENV = migrationContract.environment;
    const databaseOptionsByConsumer = [
      ['runtime', createDatabaseOptions()],
      ['compiled CLI', createDatabaseCliOptions()],
    ];

    for (const [consumerName, databaseOptions] of databaseOptionsByConsumer) {
      const contractName = `${migrationContract.environment} ${consumerName}`;
      const migrationGlobs = databaseMigrationGlobs(
        databaseOptions,
        contractName,
      );
      const hasDemoDatabaseMigration = migrationGlobs.some((migrationGlob) =>
        migrationGlob.includes('demo-database'),
      );

      if (
        migrationContract.shouldIncludeDemoMigration &&
        !migrationGlobs.includes(demoDatabaseMigrationGlob)
      ) {
        architectureViolations.push(
          `${contractName} must include ${demoDatabaseMigrationGlob}`,
        );
      }

      if (
        !migrationContract.shouldIncludeDemoMigration &&
        hasDemoDatabaseMigration
      ) {
        architectureViolations.push(
          `${contractName} must not include a demo-database migration`,
        );
      }

      checkedMigrationContractCount += 1;
    }
  }

  process.env.NODE_ENV = 'production';
  return checkedMigrationContractCount;
}

async function verifyCapabilityImports() {
  for (const capabilityContract of capabilityContracts) {
    const consumerModule = await importCompiledModule(
      capabilityContract.consumerPath,
      capabilityContract.consumerExport,
    );
    const consumerImports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      consumerModule,
    );
    const importedNames = new Set(
      (consumerImports ?? []).map(importedModuleName).filter(Boolean),
    );

    for (const requiredImport of capabilityContract.requiredImports) {
      if (!importedNames.has(requiredImport)) {
        architectureViolations.push(
          `${capabilityContract.consumerExport} must import ${requiredImport}`,
        );
      }
    }
  }
}

function productionEnvironment() {
  return {
    NODE_ENV: 'production',
    CORS_ORIGINS: 'https://architecture.example.com',
    CSRF_ENABLED: 'false',
    DB_HOST: 'database.internal',
    DB_PORT: '3306',
    DB_USERNAME: 'application',
    DB_PASSWORD: 'architecture-verifier-password',
    DB_DATABASE: 'application',
    REDIS_URL: 'redis://redis.internal:6379',
    BETTER_AUTH_SECRET: randomBytes(48).toString('base64url'),
    BETTER_AUTH_URL: 'https://api.example.com',
    JWT_SECRET: randomBytes(48).toString('base64url'),
    ENCRYPTION_KEY: randomBytes(32).toString('base64url'),
    HMAC_SECRET: randomBytes(48).toString('base64url'),
  };
}

async function verifyProductionModuleGraph() {
  Object.assign(process.env, productionEnvironment());
  const appModule = await importCompiledModule(
    'dist/src/app.module.js',
    'AppModule',
  );
  const pendingModules = [appModule];
  const visitedModules = new Set();

  while (pendingModules.length > 0) {
    const moduleEntry = pendingModules.pop();

    if (!moduleEntry || visitedModules.has(moduleEntry)) {
      continue;
    }

    visitedModules.add(moduleEntry);
    const moduleName = importedModuleName(moduleEntry);

    if (
      moduleName?.startsWith('Demo') ||
      productionForbiddenModules.has(moduleName)
    ) {
      architectureViolations.push(
        `production module graph contains ${moduleName}`,
      );
    }

    const moduleType =
      typeof moduleEntry === 'function' ? moduleEntry : moduleEntry.module;
    const metadataImports =
      typeof moduleType === 'function'
        ? (Reflect.getMetadata(MODULE_METADATA.IMPORTS, moduleType) ?? [])
        : [];
    const dynamicImports =
      typeof moduleEntry === 'object' &&
      moduleEntry !== null &&
      'imports' in moduleEntry &&
      Array.isArray(moduleEntry.imports)
        ? moduleEntry.imports
        : [];

    pendingModules.push(...metadataImports, ...dynamicImports);
  }

  return visitedModules.size;
}

const checkedSourceFileCount = await verifySourceBoundaries();
await verifyCapabilityImports();
const checkedMigrationContractCount = await verifyMigrationOwnership();
const checkedProductionModuleCount = await verifyProductionModuleGraph();

if (architectureViolations.length > 0) {
  throw new Error(
    `Architecture contract violations:\n${architectureViolations
      .map((violation) => `- ${violation}`)
      .join('\n')}`,
  );
}

console.log(
  `Verified architecture boundaries across ${checkedSourceFileCount} source files, ${capabilityContracts.length} capability contracts, ${checkedMigrationContractCount} migration contracts, and ${checkedProductionModuleCount} production module entries.`,
);
