import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';

import { MODULE_METADATA } from '@nestjs/common/constants.js';
import ts from 'typescript';

const projectRoot = process.cwd();
const sourceRoot = resolve(projectRoot, 'src');
const platformRoot = resolve(sourceRoot, 'platform');
const contractsRoot = resolve(sourceRoot, 'contracts');
const featuresRoot = resolve(sourceRoot, 'features');
const examplesRoot = resolve(sourceRoot, 'examples');
const bootstrapRoot = resolve(sourceRoot, 'bootstrap');
const legacyCommonRoot = resolve(sourceRoot, 'common');
const architectureViolations = [];

const capabilityContracts = [
  {
    consumerPath: 'dist/src/platform/operations/health/health.module.js',
    consumerExport: 'CommonHealthModule',
    requiredImports: ['CommonCacheModule'],
  },
  {
    consumerPath: 'dist/src/examples/demo-auth/demo-auth.module.js',
    consumerExport: 'DemoAuthModule',
    requiredImports: ['CommonAuthModule'],
  },
  {
    consumerPath:
      'dist/src/examples/demo-authorization/demo-authorization.module.js',
    consumerExport: 'DemoAuthorizationModule',
    requiredImports: ['CommonAuthModule', 'CommonAuthorizationModule'],
  },
  {
    consumerPath: 'dist/src/examples/demo-cache/demo-cache.module.js',
    consumerExport: 'DemoCacheModule',
    requiredImports: ['CommonCacheModule'],
  },
  {
    consumerPath: 'dist/src/examples/demo-crypto/demo-crypto.module.js',
    consumerExport: 'DemoCryptoModule',
    requiredImports: ['CommonCryptoModule'],
  },
  {
    consumerPath: 'dist/src/examples/demo-csrf/demo-csrf.module.js',
    consumerExport: 'DemoCsrfModule',
    requiredImports: ['CommonCsrfModule'],
  },
  {
    consumerPath: 'dist/src/examples/demo-events/demo-events.module.js',
    consumerExport: 'DemoEventsModule',
    requiredImports: ['EventEmitterModule'],
  },
  {
    consumerPath: 'dist/src/examples/demo-http/demo-http.module.js',
    consumerExport: 'DemoHttpModule',
    requiredImports: ['CommonHttpClientModule'],
  },
  {
    consumerPath: 'dist/src/examples/demo-queue/demo-queue.module.js',
    consumerExport: 'DemoQueueModule',
    requiredImports: ['CommonQueueModule'],
  },
  {
    consumerPath: 'dist/src/examples/demo-schedule/demo-schedule.module.js',
    consumerExport: 'DemoScheduleModule',
    requiredImports: ['CommonScheduleModule'],
  },
  {
    consumerPath: 'dist/src/examples/demo-websocket/demo-websocket.module.js',
    consumerExport: 'DemoWebsocketModule',
    requiredImports: ['CommonAuthModule'],
  },
];

const productionForbiddenModules = new Set([
  'CommonAuthModule',
  'CommonAuthorizationModule',
  'CommonCryptoModule',
  'CommonHttpClientModule',
  'CommonQueueModule',
  'CommonScheduleModule',
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
  const platformFiles = await listTypeScriptFiles(platformRoot);

  for (const platformFile of platformFiles) {
    const sourceText = await readFile(platformFile, 'utf8');
    const sourceFile = ts.createSourceFile(
      platformFile,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
    );

    // AI modified: platform dependencies stay explicit instead of becoming invisible application globals.
    if (/@Global\s*\(/u.test(sourceText)) {
      architectureViolations.push(
        `${relative(projectRoot, platformFile)} uses @Global()`,
      );
    }

    for (const moduleSpecifier of moduleSpecifiers(sourceFile)) {
      if (!moduleSpecifier.startsWith('.')) {
        continue;
      }

      const dependencyPath = resolve(dirname(platformFile), moduleSpecifier);

      // AI modified: production features and removable examples are both callers of platform capabilities.
      if (
        isInside(dependencyPath, featuresRoot) ||
        isInside(dependencyPath, examplesRoot) ||
        isInside(dependencyPath, bootstrapRoot)
      ) {
        architectureViolations.push(
          `${relative(projectRoot, platformFile)} imports an application layer ${moduleSpecifier}`,
        );
      }
    }
  }

  const featureFiles = await listTypeScriptFiles(featuresRoot);

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

      if (
        isInside(dependencyPath, examplesRoot) ||
        isInside(dependencyPath, bootstrapRoot)
      ) {
        architectureViolations.push(
          `${relative(projectRoot, featureFile)} imports a non-production layer ${moduleSpecifier}`,
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
        isInside(dependencyPath, featuresRoot) ||
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
        isInside(dependencyPath, featuresRoot) ||
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

  for (const legacyCommonFile of legacyCommonFiles) {
    architectureViolations.push(
      `${relative(projectRoot, legacyCommonFile)} remains in the retired common layer`,
    );
  }

  return (
    platformFiles.length +
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
    'dist/config/database.config.js',
    'createDatabaseOptions',
  );
  const createDatabaseCliOptions = await importCompiledModule(
    'dist/config/database.config.js',
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
