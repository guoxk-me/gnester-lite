import { verifySourceBoundaries } from './verify-source-boundaries.mjs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { MODULE_METADATA } from '@nestjs/common/constants.js';

const projectRoot = process.cwd();
const architectureViolations = [];
// AI modified: compiled contracts follow the actual consumers rather than hardcoding removable examples.
const capabilityContracts = [
  {
    consumerPath: 'dist/src/modules/application.module.js',
    consumerExport: 'ApplicationModule',
    requiredImports: ['IdentityModule', 'AssistantModule'],
  },
  {
    consumerPath: 'dist/src/modules/identity/identity.module.js',
    consumerExport: 'IdentityModule',
    requiredImports: ['ApplicationAuthModule', 'UserManagementModule'],
  },
  {
    consumerPath: 'dist/src/modules/identity/application-auth.module.js',
    consumerExport: 'ApplicationAuthModule',
    requiredImports: ['AuthModule', 'CsrfModule'],
  },
  {
    consumerPath: 'dist/src/modules/assistant/assistant.module.js',
    consumerExport: 'AssistantModule',
    requiredImports: [
      'IdentityModule',
      'QueueModule',
      'CryptoModule',
      'ScheduleModule',
    ],
  },
  {
    consumerPath: 'dist/src/infra/health/health.module.js',
    consumerExport: 'HealthModule',
    requiredImports: ['CacheModule'],
  },
  {
    consumerPath: 'dist/src/infra/http/http-response.module.js',
    consumerExport: 'HttpResponseModule',
    requiredImports: ['I18nCatalogModule'],
  },
];

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

async function verifyMigrationOwnership() {
  Object.assign(process.env, productionEnvironment());
  const createDatabaseOptions = await importCompiledModule(
    'dist/src/infra/database/database.config.js',
    'createDatabaseOptions',
  );
  const createDatabaseCliOptions = await importCompiledModule(
    'dist/src/infra/database/database.config.js',
    'createDatabaseCliOptions',
  );
  let checked = 0;
  // AI modified: every environment discovers the same unchanged application history after Demo removal.
  for (const environment of ['production', 'provision']) {
    process.env.NODE_ENV = environment;
    for (const options of [
      createDatabaseOptions(),
      createDatabaseCliOptions(),
    ]) {
      if (
        JSON.stringify(options.migrations) !==
        JSON.stringify(['dist/src/infra/database/migrations/*.js'])
      )
        architectureViolations.push(
          `${environment} must discover only application migrations`,
        );
      checked++;
    }
  }
  process.env.NODE_ENV = 'production';
  return checked;
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
    CSRF_ENABLED: 'true',
    CSRF_SECRET: randomBytes(48).toString('base64url'),
    DB_HOST: 'database.internal',
    DB_PORT: '3306',
    DB_USERNAME: 'application',
    DB_PASSWORD: 'architecture-verifier-password',
    DB_DATABASE: 'application',
    REDIS_URL: 'redis://redis.internal:6379',
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

    if (moduleName?.startsWith('Demo')) {
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

const sourceViolations = await verifySourceBoundaries(projectRoot);
architectureViolations.push(...sourceViolations);
await verifyCapabilityImports();
const checkedMigrationContractCount = await verifyMigrationOwnership();
const checkedProductionModuleCount = await verifyProductionModuleGraph();
// AI modified: the declared public guard must actually be reachable through the owning Nest module exports.
const identity = await importCompiledModule(
  'dist/src/modules/identity/identity.module.js',
  'IdentityModule',
);
const guard = await importCompiledModule(
  'dist/src/modules/identity/session-auth.guard.js',
  'SessionAuthGuard',
);
const pendingExports = [identity];
const visitedExports = new Set();
while (pendingExports.length) {
  const entry = pendingExports.pop();
  if (visitedExports.has(entry)) continue;
  visitedExports.add(entry);
  pendingExports.push(
    ...(Reflect.getMetadata(MODULE_METADATA.EXPORTS, entry) ?? []),
  );
}
if (!visitedExports.has(guard))
  architectureViolations.push(
    'IdentityModule must export SessionAuthGuard through its session module',
  );
if (architectureViolations.length)
  throw new Error(
    `Architecture contract violations:\n${architectureViolations.map((violation) => `- ${violation}`).join('\n')}`,
  );
console.log(
  `Verified source ownership, public Nest exports, ${capabilityContracts.length} module contracts, ${checkedMigrationContractCount} migration contracts and ${checkedProductionModuleCount} production module entries.`,
);
