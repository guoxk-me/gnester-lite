import { readdir } from 'node:fs/promises';
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

const [openApiMetadataModule, openApiConfigModule] = await Promise.all([
  import('../dist/src/metadata.js'),
  import('../dist/src/bootstrap/http/openapi.config.js'),
]);
const openApiMetadata =
  typeof openApiMetadataModule.default === 'function'
    ? openApiMetadataModule.default
    : openApiMetadataModule.default.default;
const applyCsrfOpenApiContract =
  openApiConfigModule.applyCsrfOpenApiContract ??
  openApiConfigModule.default.applyCsrfOpenApiContract;

function referencesSchema(schema, expectedReference) {
  if (!schema || typeof schema !== 'object') {
    return false;
  }

  if ('$ref' in schema && schema.$ref === expectedReference) {
    return true;
  }

  return (
    'allOf' in schema &&
    Array.isArray(schema.allOf) &&
    schema.allOf.some(
      (nestedSchema) =>
        nestedSchema &&
        typeof nestedSchema === 'object' &&
        '$ref' in nestedSchema &&
        nestedSchema.$ref === expectedReference,
    )
  );
}

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

function getRequestSchema(document, path, method, mediaType) {
  const requestBody = document.paths[path]?.[method]?.requestBody;

  return requestBody && !('$ref' in requestBody)
    ? requestBody.content?.[mediaType]?.schema
    : undefined;
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

await app.init();

try {
  await SwaggerModule.loadPluginMetadata(openApiMetadata);
  const openApiConfig = new DocumentBuilder().addBearerAuth().build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  applyCsrfOpenApiContract(document, {
    getHeaderName: () => 'x-csrf-token',
    isEnabled: () => true,
  });
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
  const signInSchema = document.components?.schemas?.SignInDto;

  if (
    !signInSchema ||
    !('required' in signInSchema) ||
    !Array.isArray(signInSchema.required) ||
    !signInSchema.required.includes('username') ||
    !signInSchema.required.includes('password')
  ) {
    throw new Error(
      'OpenAPI SignInDto schema is missing required credentials.',
    );
  }

  const guardedOperations = [
    document.paths['/demo-auth/profile']?.get,
    document.paths['/demo-authorization/admin-report']?.get,
    document.paths['/demo-authorization/audit-log']?.get,
    document.paths['/demo-authorization/users/{userId}/profile']?.get,
  ];

  for (const guardedOperation of guardedOperations) {
    if (
      !guardedOperation?.security?.some(
        (securityRequirement) => 'bearer' in securityRequirement,
      ) ||
      !guardedOperation.responses?.['401']
    ) {
      throw new Error(
        'OpenAPI guarded operation is missing bearer security or 401 response.',
      );
    }
  }

  const loginOperation = document.paths['/demo-auth/login']?.post;

  if (
    !loginOperation?.responses?.['400'] ||
    !loginOperation.responses['401'] ||
    !loginOperation.responses['429']
  ) {
    throw new Error('OpenAPI login errors must document 400, 401, and 429.');
  }

  const profileSchema =
    document.paths['/demo-auth/profile']?.get?.responses?.['200']?.content?.[
      'application/json'
    ]?.schema;

  if (
    !profileSchema ||
    !('$ref' in profileSchema) ||
    profileSchema.$ref !== '#/components/schemas/DemoAuthProfileDto'
  ) {
    throw new Error(
      'OpenAPI profile response must reference DemoAuthProfileDto.',
    );
  }

  const profileProperties =
    document.components?.schemas?.DemoAuthProfileDto?.properties;

  if (
    !profileProperties ||
    !('sub' in profileProperties) ||
    !('username' in profileProperties) ||
    !('roles' in profileProperties) ||
    !('permissions' in profileProperties)
  ) {
    throw new Error(
      'OpenAPI profile schema is missing public identity fields.',
    );
  }

  const cartSchema =
    document.paths['/demo-session/cart']?.get?.responses?.['200']?.content?.[
      'application/json'
    ]?.schema;

  if (
    !cartSchema ||
    !('type' in cartSchema) ||
    cartSchema.type !== 'array' ||
    !('items' in cartSchema) ||
    !cartSchema.items ||
    !('$ref' in cartSchema.items) ||
    cartSchema.items.$ref !== '#/components/schemas/DemoSessionCartItemDto'
  ) {
    throw new Error(
      'OpenAPI session cart response must reference DemoSessionCartItemDto.',
    );
  }

  const sessionStateSchema = document.components?.schemas?.DemoSessionStateDto;
  const sessionUserSchema = document.components?.schemas?.DemoSessionUserDto;
  const sessionFlashSchema =
    document.components?.schemas?.DemoSessionFlashMessageDto;
  const flashMessagesSchema =
    document.components?.schemas?.DemoSessionFlashMessagesDto;

  if (
    !sessionStateSchema ||
    !('properties' in sessionStateSchema) ||
    !sessionStateSchema.properties ||
    !referencesSchema(
      sessionStateSchema.properties.user,
      '#/components/schemas/DemoSessionUserDto',
    ) ||
    !('items' in sessionStateSchema.properties.flashMessages) ||
    !sessionStateSchema.properties.flashMessages.items ||
    !('$ref' in sessionStateSchema.properties.flashMessages.items) ||
    sessionStateSchema.properties.flashMessages.items.$ref !==
      '#/components/schemas/DemoSessionFlashMessageDto' ||
    !('items' in sessionStateSchema.properties.cart) ||
    !sessionStateSchema.properties.cart.items ||
    !('$ref' in sessionStateSchema.properties.cart.items) ||
    sessionStateSchema.properties.cart.items.$ref !==
      '#/components/schemas/DemoSessionCartItemDto'
  ) {
    throw new Error(
      'OpenAPI session state must reference the public nested DTO schemas.',
    );
  }

  if (
    !sessionUserSchema ||
    !('properties' in sessionUserSchema) ||
    !sessionUserSchema.properties ||
    !('userId' in sessionUserSchema.properties) ||
    !('displayName' in sessionUserSchema.properties) ||
    !('role' in sessionUserSchema.properties) ||
    !('authenticatedAt' in sessionUserSchema.properties) ||
    !sessionFlashSchema ||
    !('properties' in sessionFlashSchema) ||
    !sessionFlashSchema.properties ||
    !('id' in sessionFlashSchema.properties) ||
    !('level' in sessionFlashSchema.properties) ||
    !('message' in sessionFlashSchema.properties) ||
    !('createdAt' in sessionFlashSchema.properties)
  ) {
    throw new Error(
      'OpenAPI session nested schemas are missing their allowlisted fields.',
    );
  }

  if (
    !flashMessagesSchema ||
    !('properties' in flashMessagesSchema) ||
    !flashMessagesSchema.properties ||
    !('items' in flashMessagesSchema.properties.messages) ||
    !flashMessagesSchema.properties.messages.items ||
    !('$ref' in flashMessagesSchema.properties.messages.items) ||
    flashMessagesSchema.properties.messages.items.$ref !==
      '#/components/schemas/DemoSessionFlashMessageDto'
  ) {
    throw new Error(
      'OpenAPI consumed flash messages must reference DemoSessionFlashMessageDto.',
    );
  }

  // AI modified: verify special wire formats against the generated document, not decorator metadata.
  const serializationResponses = [
    [
      '/demo-serialization/profile',
      '#/components/schemas/DemoSerializationProfileResponseDto',
    ],
    [
      '/demo-serialization/profile/admin',
      '#/components/schemas/DemoSerializationAdminProfileResponseDto',
    ],
    [
      '/demo-serialization/profile/plain',
      '#/components/schemas/DemoSerializationProfileResponseDto',
    ],
    [
      '/demo-serialization/page/plain',
      '#/components/schemas/DemoSerializationPageResponseDto',
    ],
  ];

  for (const [path, expectedReference] of serializationResponses) {
    assertContract(
      referencesSchema(
        getResponseSchema(document, path, 'get', 200),
        expectedReference,
      ),
      `OpenAPI ${path} response does not match the serialized wire DTO.`,
    );
  }

  const publicProfileProperties = Object.keys(
    getSchemaProperties(
      document,
      getResponseSchema(document, '/demo-serialization/profile', 'get', 200),
    ),
  ).sort();
  const expectedPublicProfileProperties = [
    'emailAddress',
    'firstName',
    'fullName',
    'id',
    'lastName',
    'role',
  ];

  assertContract(
    JSON.stringify(publicProfileProperties) ===
      JSON.stringify(expectedPublicProfileProperties),
    'OpenAPI public serialization profile exposes hidden fields or misses transformed fields.',
  );

  const adminProfileProperties = Object.keys(
    getSchemaProperties(
      document,
      getResponseSchema(
        document,
        '/demo-serialization/profile/admin',
        'get',
        200,
      ),
    ),
  ).sort();

  assertContract(
    JSON.stringify(adminProfileProperties) ===
      JSON.stringify([...expectedPublicProfileProperties, 'auditTrail'].sort()),
    'OpenAPI admin serialization profile does not match the admin group.',
  );

  const serializedPageProperties = getSchemaProperties(
    document,
    getResponseSchema(document, '/demo-serialization/page/plain', 'get', 200),
  );

  assertContract(
    serializedPageProperties.data?.type === 'array' &&
      referencesSchema(
        serializedPageProperties.data.items,
        '#/components/schemas/DemoSerializationProfileResponseDto',
      ) &&
      !('_cacheKey' in serializedPageProperties),
    'OpenAPI serialized page must contain public profiles and omit cache metadata.',
  );

  const ssePaths = [
    '/demo-sse/notifications',
    '/demo-sse/job-progress',
    '/demo-sse/activity-feed',
    '/demo-sse/metrics',
    '/demo-sse/heartbeat',
  ];

  for (const path of ssePaths) {
    const response = getResponse(document, path, 'get', 200);
    const mediaTypes = Object.keys(response?.content ?? {});

    assertContract(
      mediaTypes.length === 1 &&
        mediaTypes[0] === 'text/event-stream' &&
        response.content['text/event-stream']?.schema?.type === 'string' &&
        response.headers?.['Cache-Control'] &&
        response.headers?.['X-Accel-Buffering'],
      `OpenAPI ${path} must expose an SSE stream and its transport headers.`,
    );
  }

  const streamedFiles = [
    ['/demo-streaming-files/project/package-json', 'application/json'],
    ['/demo-streaming-files/project/readme', 'text/markdown'],
    ['/demo-streaming-files/generated/report.csv', 'text/csv'],
    ['/demo-streaming-files/generated/note.txt', 'text/plain'],
  ];

  for (const [path, mediaType] of streamedFiles) {
    const response = getResponse(document, path, 'get', 200);
    const schema = response?.content?.[mediaType]?.schema;

    assertContract(
      schema?.type === 'string' &&
        schema.format === 'binary' &&
        response.headers?.['Content-Disposition'] &&
        response.headers?.['Content-Length'],
      `OpenAPI ${path} must expose its binary media type and download headers.`,
    );
  }

  const multipartBodies = [
    ['/demo-upload/chunked/{uploadId}/chunks/{chunkIndex}', 'put', 'chunk'],
    ['/demo-upload/single', 'post', 'file'],
    ['/demo-upload/image', 'post', 'image'],
  ];

  for (const [path, method, fieldName] of multipartBodies) {
    const schema = getRequestSchema(
      document,
      path,
      method,
      'multipart/form-data',
    );

    assertContract(
      schema?.properties?.[fieldName]?.type === 'string' &&
        schema.properties[fieldName].format === 'binary' &&
        schema.required?.includes(fieldName),
      `OpenAPI ${path} is missing its required binary multipart field.`,
    );
  }

  const fileArraySchema = getRequestSchema(
    document,
    '/demo-upload/files',
    'post',
    'multipart/form-data',
  )?.properties?.files;

  assertContract(
    fileArraySchema?.type === 'array' &&
      fileArraySchema.maxItems === 3 &&
      fileArraySchema.items?.format === 'binary',
    'OpenAPI file-array upload must describe the bounded binary array.',
  );

  const profileAssetsSchema = getRequestSchema(
    document,
    '/demo-upload/profile-assets',
    'post',
    'multipart/form-data',
  );

  assertContract(
    profileAssetsSchema?.properties?.avatar?.format === 'binary' &&
      profileAssetsSchema.properties.background?.format === 'binary',
    'OpenAPI profile-assets upload must describe avatar and background files.',
  );

  const arbitraryFilesSchema = getRequestSchema(
    document,
    '/demo-upload/any',
    'post',
    'multipart/form-data',
  );
  const multipartFormSchema = getRequestSchema(
    document,
    '/demo-upload/form',
    'post',
    'multipart/form-data',
  );

  assertContract(
    Array.isArray(arbitraryFilesSchema?.additionalProperties?.oneOf) &&
      arbitraryFilesSchema.additionalProperties.oneOf.some(
        (schema) => schema.format === 'binary',
      ),
    'OpenAPI arbitrary-file upload must allow binary multipart fields.',
  );
  assertContract(
    multipartFormSchema?.maxProperties === 20 &&
      Array.isArray(multipartFormSchema.additionalProperties?.oneOf),
    'OpenAPI multipart form must expose the bounded text-field shape.',
  );

  const chunkedUploadSchema =
    document.components?.schemas?.CreateDemoChunkedUploadDto;
  const chunkedUploadProperties = chunkedUploadSchema?.properties;

  assertContract(
    chunkedUploadProperties?.fileSize?.maximum === 20 * 1024 * 1024 &&
      chunkedUploadProperties.chunkSize?.maximum === 1024 * 1024 &&
      chunkedUploadProperties.totalChunks?.maximum === 200 &&
      chunkedUploadProperties.fileSize.type === 'integer' &&
      chunkedUploadProperties.chunkSize.type === 'integer' &&
      chunkedUploadProperties.totalChunks.type === 'integer',
    'OpenAPI chunked-upload limits must match runtime validation.',
  );

  const uploadFieldProperties =
    document.components?.schemas?.DemoUploadFileFieldsDto?.properties;

  assertContract(
    referencesSchema(
      uploadFieldProperties?.fields?.additionalProperties?.items,
      '#/components/schemas/DemoUploadFileDto',
    ),
    'OpenAPI upload field groups must reference DemoUploadFileDto items.',
  );

  const privateCookiePaths = ['/demo-cookies', '/demo-cookies/{name}'];

  for (const path of privateCookiePaths) {
    assertContract(
      getResponse(document, path, 'get', 200)?.headers?.['Cache-Control'],
      `OpenAPI ${path} must document private no-store caching.`,
    );
  }

  const cookieWriteOperations = [
    ['/demo-cookies/preferences', 'post', 201],
    ['/demo-cookies/session', 'post', 201],
    ['/demo-cookies/session', 'delete', 200],
  ];

  for (const [path, method, status] of cookieWriteOperations) {
    assertContract(
      getResponse(document, path, method, status)?.headers?.['Set-Cookie'],
      `OpenAPI ${method.toUpperCase()} ${path} must document Set-Cookie.`,
    );
  }

  const cookieSameSiteSchema =
    document.components?.schemas?.DemoCookieWriteDto?.properties?.sameSite;

  assertContract(
    cookieSameSiteSchema?.type === 'string' &&
      JSON.stringify(cookieSameSiteSchema.enum) ===
        JSON.stringify(['lax', 'strict', 'none']) &&
      getResponse(document, '/demo-cookies/{name}', 'get', 400) &&
      getResponse(document, '/demo-cookies/preferences', 'post', 400) &&
      getResponse(document, '/demo-cookies/session', 'post', 503),
    'OpenAPI cookie contracts must expose sameSite and reachable failures.',
  );

  assertContract(
    getResponse(document, '/demo-cors/public-resource', 'get', 200)?.headers?.[
      'X-Demo-Cors-Trace'
    ] &&
      getResponse(document, '/demo-cors/credentialed-resource', 'get', 200)
        ?.headers?.['Cache-Control'],
    'OpenAPI CORS demos must expose the trace and private-cache response headers.',
  );

  const csrfTokenResponse = getResponse(
    document,
    '/demo-csrf/token',
    'get',
    200,
  );
  const csrfTransferOperation =
    document.paths['/demo-csrf/transfer-preview']?.post;

  assertContract(
    csrfTokenResponse?.headers?.['Cache-Control'] &&
      csrfTokenResponse.headers['Set-Cookie'] &&
      getResponse(document, '/demo-csrf/token', 'get', 503),
    'OpenAPI CSRF token response must document no-store, cookies, and disabled state.',
  );
  assertContract(
    csrfTransferOperation?.parameters?.some(
      (parameter) =>
        !('$ref' in parameter) &&
        parameter.in === 'header' &&
        parameter.name === 'x-csrf-token' &&
        parameter.required,
    ) &&
      csrfTransferOperation.responses?.['400'] &&
      csrfTransferOperation.responses['403'],
    'OpenAPI CSRF mutation must require the token header and expose validation failures.',
  );

  for (const [path, pathContract] of Object.entries(document.paths)) {
    for (const method of ['post', 'put', 'patch', 'delete']) {
      const operation = pathContract[method];

      if (!operation) {
        continue;
      }

      const csrfHeaders = operation.parameters?.filter(
        (parameter) =>
          !('$ref' in parameter) &&
          parameter.in === 'header' &&
          parameter.name === 'x-csrf-token' &&
          parameter.required,
      );

      assertContract(
        csrfHeaders?.length === 1 && operation.responses?.['403'],
        `OpenAPI ${method.toUpperCase()} ${path} must expose the global CSRF contract exactly once.`,
      );
    }
  }

  for (const [path, pathContract] of Object.entries(customCsrfDocument.paths)) {
    for (const method of ['post', 'put', 'patch', 'delete']) {
      const operation = pathContract[method];

      if (!operation) {
        continue;
      }

      const configuredHeaders = operation.parameters?.filter(
        (parameter) =>
          !('$ref' in parameter) &&
          parameter.in === 'header' &&
          parameter.name === 'x-configured-csrf' &&
          parameter.required,
      );
      const staleDefaultHeader = operation.parameters?.some(
        (parameter) =>
          !('$ref' in parameter) &&
          parameter.in === 'header' &&
          parameter.name === 'x-csrf-token',
      );

      assertContract(
        configuredHeaders?.length === 1 &&
          !staleDefaultHeader &&
          operation.responses?.['403'],
        `OpenAPI ${method.toUpperCase()} ${path} must use the configured CSRF header.`,
      );
    }
  }

  const privateSessionPaths = [
    '/demo-session',
    '/demo-session/flash',
    '/demo-session/cart',
  ];

  for (const path of privateSessionPaths) {
    assertContract(
      getResponse(document, path, 'get', 200)?.headers?.['Cache-Control'] &&
        getResponse(document, path, 'get', 503),
      `OpenAPI ${path} must document private caching and unavailable sessions.`,
    );
  }

  assertContract(
    getResponse(document, '/demo-session/login', 'post', 400) &&
      getResponse(document, '/demo-session/login', 'post', 503) &&
      getResponse(document, '/demo-session/cart/items', 'post', 400) &&
      getResponse(document, '/demo-session/cart/items', 'post', 503) &&
      getResponse(document, '/demo-session/cart/items/{sku}', 'delete', 400) &&
      getResponse(document, '/demo-session', 'delete', 503),
    'OpenAPI session mutations must expose validation and unavailable middleware failures.',
  );
} finally {
  await app.close();
}
