import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  GUARDS_METADATA,
  INTERCEPTORS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as yaml from 'js-yaml';

// AI modified: NestJS 12 embeds OpenAPI metadata in compiled DTOs.
const openApiConfigModule =
  await import('../dist/src/bootstrap/http/openapi.config.js');
const applyCsrfOpenApiContract =
  openApiConfigModule.applyCsrfOpenApiContract ??
  openApiConfigModule.default.applyCsrfOpenApiContract;
const applyI18nOpenApiContract =
  openApiConfigModule.applyI18nOpenApiContract ??
  openApiConfigModule.default.applyI18nOpenApiContract;

function getResponse(document, path, method, status) {
  return document.paths[path]?.[method]?.responses?.[String(status)];
}

function getResponseSchema(
  document,
  path,
  method,
  status,
  mediaType = 'application/json',
) {
  return getResponse(document, path, method, status)?.content?.[mediaType]
    ?.schema;
}

function getSchemaProperties(document, schema, visitedReferences = new Set()) {
  if (!schema || typeof schema !== 'object') {
    return {};
  }

  let properties =
    'properties' in schema && schema.properties ? schema.properties : {};

  if ('$ref' in schema && typeof schema.$ref === 'string') {
    if (visitedReferences.has(schema.$ref)) {
      return properties;
    }

    visitedReferences.add(schema.$ref);
    const schemaName = schema.$ref.split('/').at(-1);
    const referencedSchema = document.components?.schemas?.[schemaName];
    properties = {
      ...getSchemaProperties(document, referencedSchema, visitedReferences),
      ...properties,
    };
  }

  if ('allOf' in schema && Array.isArray(schema.allOf)) {
    for (const nestedSchema of schema.allOf) {
      properties = {
        ...properties,
        ...getSchemaProperties(document, nestedSchema, visitedReferences),
      };
    }
  }

  return properties;
}

function isRawResponseOperation(operation) {
  if (operation['x-skip-api-envelope'] === true) {
    return true;
  }

  return Object.entries(operation.responses ?? {}).some(
    ([status, response]) =>
      status.startsWith('2') &&
      response &&
      !('$ref' in response) &&
      Boolean(response.content?.['text/event-stream']),
  );
}

// AI modified: binary responses stay native, but errors on download operations still require the envelope.
function isNativeMediaResponse(response) {
  const content = response.content;

  if (!content || Object.keys(content).length === 0) {
    return false;
  }

  const jsonMediaContract = content['application/json'];

  if (!jsonMediaContract) {
    return true;
  }

  const responseSchema = jsonMediaContract.schema;

  return Boolean(
    responseSchema &&
    !('$ref' in responseSchema) &&
    responseSchema.format === 'binary',
  );
}

// AI modified: validate the final response root and language header for every generated operation, including decorator-added errors.
function assertI18nOpenApiContract(document) {
  const httpMethods = [
    'delete',
    'get',
    'head',
    'options',
    'patch',
    'post',
    'put',
    'trace',
  ];

  for (const [path, pathContract] of Object.entries(document.paths)) {
    for (const method of httpMethods) {
      const operation = pathContract[method];

      if (!operation) {
        continue;
      }

      if (isRawResponseOperation(operation)) {
        continue;
      }

      const languageHeaders = operation.parameters?.filter(
        (parameter) =>
          !('$ref' in parameter) &&
          parameter.in === 'header' &&
          parameter.name.toLowerCase() === 'accept-language',
      );

      assertContract(
        languageHeaders?.length === 1 &&
          languageHeaders[0].required === false &&
          languageHeaders[0].schema?.type === 'string' &&
          !languageHeaders[0].schema.enum,
        `OpenAPI ${method.toUpperCase()} ${path} must expose Accept-Language exactly once.`,
      );

      for (const [status, response] of Object.entries(
        operation.responses ?? {},
      )) {
        if (!response || '$ref' in response) {
          continue;
        }

        if (status === '204') {
          assertContract(
            !response.content,
            `OpenAPI ${method.toUpperCase()} ${path} 204 response must not declare a body.`,
          );
          continue;
        }

        if (isNativeMediaResponse(response)) {
          continue;
        }

        const schema = response.content?.['application/json']?.schema;
        const properties = getSchemaProperties(document, schema);
        const contentLanguageHeader = response.headers?.['Content-Language'];
        const varyHeader = response.headers?.Vary;

        assertContract(
          schema?.type === 'object' &&
            Array.isArray(schema.required) &&
            ['code', 'message', 'data', 'errors'].every((propertyName) =>
              schema.required.includes(propertyName),
            ) &&
            properties.code?.type === 'integer' &&
            properties.message?.type === 'string' &&
            properties.data &&
            properties.errors?.type === 'array' &&
            properties.errors.nullable === true,
          `OpenAPI ${method.toUpperCase()} ${path} ${status} must declare the API envelope.`,
        );
        assertContract(
          contentLanguageHeader &&
            !('$ref' in contentLanguageHeader) &&
            contentLanguageHeader.schema?.type === 'string' &&
            varyHeader &&
            !('$ref' in varyHeader) &&
            varyHeader.schema?.type === 'string',
          `OpenAPI ${method.toUpperCase()} ${path} ${status} must declare Content-Language and Vary response headers.`,
        );
      }
    }
  }

  const healthProperties = getSchemaProperties(
    document,
    getResponseSchema(document, apiPath('/health/live'), 'get', 200),
  );

  assertContract(
    healthProperties.status && !healthProperties.code,
    'OpenAPI health probes must retain the native Terminus contract.',
  );
  assertContract(
    Object.keys(document.paths).every(
      (path) => path !== '/api/auth' && !path.startsWith('/api/auth/'),
    ),
    'OpenAPI must not claim retired native authentication routes.',
  );
}

function assertContract(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function listControllerFilePaths(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const entryFilePaths = await Promise.all(
    entries.map((entry) => {
      const entryPath = join(directoryPath, entry.name);

      return entry.isDirectory()
        ? listControllerFilePaths(entryPath)
        : [entryPath];
    }),
  );

  return entryFilePaths
    .flat()
    .filter((entryPath) => entryPath.endsWith('.controller.js'));
}

function getModuleExportValues(moduleNamespace) {
  const commonJsDefault =
    moduleNamespace.default && typeof moduleNamespace.default === 'object'
      ? Object.values(moduleNamespace.default)
      : [];
  const commonJsModuleExports =
    moduleNamespace['module.exports'] &&
    typeof moduleNamespace['module.exports'] === 'object'
      ? Object.values(moduleNamespace['module.exports'])
      : [];

  return [
    ...new Set([
      ...Object.values(moduleNamespace),
      ...commonJsDefault,
      ...commonJsModuleExports,
    ]),
  ];
}

async function loadHttpControllers() {
  const compiledSourcePath = fileURLToPath(
    new URL('../dist/src/', import.meta.url),
  );
  const controllerFilePaths = (
    await listControllerFilePaths(compiledSourcePath)
  )
    .filter(
      (controllerFilePath) =>
        !controllerFilePath.endsWith('-asyncapi.controller.js'),
    )
    .sort();
  const controllersByFile = await Promise.all(
    controllerFilePaths.map(async (controllerFilePath) => {
      const controllerModule = await import(
        pathToFileURL(controllerFilePath).href
      );
      const exportedControllers = getModuleExportValues(
        controllerModule,
      ).filter(
        (moduleExport) =>
          typeof moduleExport === 'function' &&
          Reflect.getMetadata(PATH_METADATA, moduleExport) !== undefined,
      );

      assertContract(
        exportedControllers.length > 0,
        `Compiled HTTP controller module exports no controller: ${controllerFilePath}`,
      );

      return exportedControllers;
    }),
  );
  const controllers = [...new Set(controllersByFile.flat())];

  assertContract(
    controllers.length >= controllerFilePaths.length,
    'OpenAPI verification did not load every compiled HTTP controller.',
  );

  return controllers;
}

function getControllerMethods(controller) {
  const methodsByName = new Map();
  let prototype = controller.prototype;

  while (prototype && prototype !== Object.prototype) {
    for (const methodName of Object.getOwnPropertyNames(prototype)) {
      if (methodName === 'constructor' || methodsByName.has(methodName)) {
        continue;
      }

      const method = prototype[methodName];

      if (typeof method === 'function') {
        methodsByName.set(methodName, method);
      }
    }

    prototype = Object.getPrototypeOf(prototype);
  }

  return methodsByName;
}

function getControllerEnhancers(controllers, metadataKey) {
  const enhancers = controllers.flatMap((controller) => [
    ...(Reflect.getMetadata(metadataKey, controller) ?? []),
    ...[...getControllerMethods(controller).values()].flatMap(
      (method) => Reflect.getMetadata(metadataKey, method) ?? [],
    ),
  ]);

  return [
    ...new Set(enhancers.filter((enhancer) => typeof enhancer === 'function')),
  ];
}

function getExpectedOperationIds(controllers) {
  return controllers.flatMap((controller) =>
    [...getControllerMethods(controller)]
      .filter(
        ([, method]) =>
          Reflect.getMetadata(METHOD_METADATA, method) !== undefined,
      )
      .map(([methodName, method]) => {
        const apiOperation = Reflect.getMetadata(
          'swagger/apiOperation',
          method,
        );

        return apiOperation?.operationId ?? `${controller.name}_${methodName}`;
      }),
  );
}

function getDocumentedOperationIds(document) {
  const httpMethods = [
    'delete',
    'get',
    'head',
    'options',
    'patch',
    'post',
    'put',
    'trace',
  ];

  return Object.values(document.paths).flatMap((pathContract) =>
    httpMethods
      .map((method) => pathContract[method]?.operationId)
      .filter((operationId) => typeof operationId === 'string'),
  );
}

// AI modified: discover every compiled HTTP controller and mock constructor dependencies so this gate never boots infrastructure modules.
const httpControllers = await loadHttpControllers();
const controllerDependencies = [
  ...new Set(
    httpControllers.flatMap(
      (controller) =>
        Reflect.getMetadata('design:paramtypes', controller) ?? [],
    ),
  ),
];
const testingModuleBuilder = Test.createTestingModule({
  controllers: httpControllers,
  providers: controllerDependencies.map((dependency) => ({
    provide: dependency,
    useValue: {},
  })),
});
const allowRequest = { canActivate: () => true };
const passThrough = { intercept: (_context, next) => next.handle() };

for (const guard of getControllerEnhancers(httpControllers, GUARDS_METADATA)) {
  testingModuleBuilder.overrideGuard(guard).useValue(allowRequest);
}

for (const interceptor of getControllerEnhancers(
  httpControllers,
  INTERCEPTORS_METADATA,
)) {
  testingModuleBuilder.overrideInterceptor(interceptor).useValue(passThrough);
}

const testingModule = await testingModuleBuilder.compile();
const app = testingModule.createNestApplication();
const compiledYamlConfig = yaml.load(
  await readFile(
    new URL('../dist/src/config/config.yaml', import.meta.url),
    'utf8',
  ),
);
const apiPrefix = compiledYamlConfig?.app?.apiPrefix;

function apiPath(routePath) {
  return `/${apiPrefix}${routePath}`;
}

assertContract(
  typeof apiPrefix === 'string' && apiPrefix.length > 0,
  'Compiled YAML configuration must declare app.apiPrefix.',
);
// AI modified: verify the same configured global-prefix contract used by runtime bootstrap.
app.setGlobalPrefix(apiPrefix, { exclude: ['/'] });

await app.init();

try {
  const openApiConfig = new DocumentBuilder()
    .addCookieAuth('gvueter_access', { type: 'apiKey' }, 'application-session')
    .addCookieAuth('gvueter_refresh', { type: 'apiKey' }, 'application-refresh')
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  applyCsrfOpenApiContract(document, {
    getHeaderName: () => 'x-csrf-token',
    isEnabled: () => true,
  });
  applyI18nOpenApiContract(document);
  assertI18nOpenApiContract(document);
  const expectedOperationIds = getExpectedOperationIds(httpControllers);
  const documentedOperationIds = new Set(getDocumentedOperationIds(document));

  assertContract(
    expectedOperationIds.length === new Set(expectedOperationIds).size,
    'HTTP controller routes contain duplicate OpenAPI operationId values.',
  );

  // AI modified: fail when any discovered controller route is absent from the generated document.
  for (const operationId of expectedOperationIds) {
    assertContract(
      documentedOperationIds.has(operationId),
      `OpenAPI document is missing controller route operationId: ${operationId}`,
    );
  }

  const customCsrfDocument = SwaggerModule.createDocument(app, openApiConfig);
  applyCsrfOpenApiContract(customCsrfDocument, {
    getHeaderName: () => 'x-configured-csrf',
    isEnabled: () => true,
  });
  // AI modified: validate retained application contracts instead of educational routes.
  const signInSchema = document.components?.schemas?.SignInBody;
  assertContract(
    signInSchema?.required?.includes('email') &&
      signInSchema.required.includes('password'),
    'Application login must document required email and password fields.',
  );
  const guardedOperations = [
    document.paths[apiPath('/session')]?.get,
    document.paths[apiPath('/admin/users')]?.get,
    document.paths[apiPath('/admin/invitations')]?.get,
    document.paths[apiPath('/assistant/conversations')]?.get,
    document.paths[apiPath('/assistant/configuration')]?.get,
  ];
  for (const operation of guardedOperations)
    assertContract(
      operation?.security?.some(
        (requirement) => 'application-session' in requirement,
      ) && operation.responses?.['401'],
      'Protected application operations must document session cookies and 401.',
    );
  assertContract(
    document.paths[apiPath('/session/refresh')]?.post?.security?.some(
      (requirement) => 'application-refresh' in requirement,
    ),
    'Refresh must document the refresh cookie independently of access-token expiry.',
  );
  assertContract(
    Object.keys(document.paths).every((path) => !path.includes('/demo-')),
    'Removed Demo routes must not appear in OpenAPI.',
  );
  for (const [documentToCheck, header] of [
    [document, 'x-csrf-token'],
    [customCsrfDocument, 'x-configured-csrf'],
  ]) {
    for (const [path, pathContract] of Object.entries(documentToCheck.paths)) {
      for (const method of ['post', 'put', 'patch', 'delete']) {
        const operation = pathContract[method];
        if (!operation) continue;
        const headers = operation.parameters?.filter(
          (parameter) =>
            !('$ref' in parameter) &&
            parameter.in === 'header' &&
            parameter.name === header &&
            parameter.required,
        );
        assertContract(
          headers?.length === 1 && operation.responses?.['403'],
          `OpenAPI ${method.toUpperCase()} ${path} must expose the configured CSRF contract exactly once.`,
        );
      }
    }
  }
  console.log(
    `Verified ${documentedOperationIds.size} application and infrastructure OpenAPI operations.`,
  );
} finally {
  await app.close();
}
