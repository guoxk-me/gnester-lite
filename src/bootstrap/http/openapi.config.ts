import { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';

import { Environment } from 'config/config.types';
import { SKIP_API_ENVELOPE_OPENAPI_EXTENSION } from '../../platform/runtime/i18n/i18n.constants';
import { CsrfService } from '../../platform/security/csrf/csrf.service';

type OpenApiPluginMetadataFactory = Parameters<
  typeof SwaggerModule.loadPluginMetadata
>[0];

export type OpenApiPluginMetadataLoader =
  () => Promise<OpenApiPluginMetadataFactory>;

type OpenApiPath = OpenAPIObject['paths'][string];
type HttpMethod =
  | 'delete'
  | 'get'
  | 'head'
  | 'options'
  | 'patch'
  | 'post'
  | 'put'
  | 'trace';
type UnsafeHttpMethod = 'delete' | 'patch' | 'post' | 'put';
type OpenApiOperation = NonNullable<OpenApiPath[HttpMethod]> &
  Partial<Record<typeof SKIP_API_ENVELOPE_OPENAPI_EXTENSION, boolean>>;
type OpenApiResponse = NonNullable<OpenApiOperation['responses'][string]>;
type InlineOpenApiResponse = Exclude<OpenApiResponse, { $ref: string }>;
type OpenApiResponseSchema = NonNullable<
  NonNullable<
    NonNullable<InlineOpenApiResponse['content']>['application/json']
  >['schema']
>;

const httpMethods: readonly HttpMethod[] = [
  'delete',
  'get',
  'head',
  'options',
  'patch',
  'post',
  'put',
  'trace',
];

const unsafeHttpMethods: readonly UnsafeHttpMethod[] = [
  'post',
  'put',
  'patch',
  'delete',
];

async function loadGeneratedOpenApiMetadata(): Promise<OpenApiPluginMetadataFactory> {
  const generatedMetadataPath = '../../metadata';
  const generatedMetadataModule = (await import(generatedMetadataPath)) as {
    readonly default: OpenApiPluginMetadataFactory;
  };

  return generatedMetadataModule.default;
}

// AI modified: generated JSON schemas must describe the global localized envelope instead of controller return values at the response root.
export function applyI18nOpenApiContract(document: OpenAPIObject): void {
  for (const [routePath, pathContract] of Object.entries(document.paths)) {
    for (const method of httpMethods) {
      const operation = pathContract[method];

      if (!operation) {
        continue;
      }

      if (isEnvelopeBypassOperation(routePath, operation)) {
        continue;
      }

      addAcceptLanguageHeader(operation);

      for (const [statusCode, responseContract] of Object.entries(
        operation.responses,
      )) {
        if (
          !responseContract ||
          '$ref' in responseContract ||
          statusCode === '204' ||
          isNativeMediaResponse(responseContract)
        ) {
          continue;
        }

        const jsonMediaContract =
          responseContract.content?.['application/json'];
        const responseSchema = jsonMediaContract?.schema;

        addLocalizedResponseHeaders(responseContract);

        if (isApiEnvelopeSchema(responseSchema)) {
          continue;
        }

        responseContract.content = {
          ...responseContract.content,
          'application/json': {
            ...jsonMediaContract,
            schema: createApiEnvelopeSchema(statusCode, responseSchema),
          },
        };
      }
    }
  }
}

function addLocalizedResponseHeaders(
  responseContract: InlineOpenApiResponse,
): void {
  const headers = responseContract.headers ?? {};
  const headerNames = new Set(
    Object.keys(headers).map((headerName) => headerName.toLowerCase()),
  );

  // AI modified: generated clients can observe the same negotiation metadata emitted at runtime.
  responseContract.headers = {
    ...headers,
    ...(!headerNames.has('content-language')
      ? {
          'Content-Language': {
            description: 'Negotiated response language',
            schema: {
              type: 'string',
              enum: ['en', 'zh'],
            },
          },
        }
      : {}),
    ...(!headerNames.has('vary')
      ? {
          Vary: {
            description: 'Response cache variation dimensions',
            schema: {
              type: 'string',
              example: 'Accept-Language',
            },
          },
        }
      : {}),
  };
}

function addAcceptLanguageHeader(operation: OpenApiOperation): void {
  const parameters = operation.parameters ?? [];
  const hasLanguageHeader = parameters.some(
    (parameter) =>
      !('$ref' in parameter) &&
      parameter.in === 'header' &&
      parameter.name.toLowerCase() === 'accept-language',
  );

  if (hasLanguageHeader) {
    return;
  }

  operation.parameters = [
    ...parameters,
    {
      name: 'Accept-Language',
      in: 'header',
      required: false,
      description:
        'Preferred response language; weighted language ranges are supported and English is the fallback',
      schema: {
        type: 'string',
        example: 'zh-CN, zh;q=0.9, en;q=0.8',
      },
    },
  ];
}

function isEnvelopeBypassOperation(
  routePath: string,
  operation: OpenApiOperation,
): boolean {
  if (
    operation[SKIP_API_ENVELOPE_OPENAPI_EXTENSION] === true ||
    routePath === '/api/auth' ||
    routePath.startsWith('/api/auth/')
  ) {
    return true;
  }

  return Object.entries(operation.responses).some(
    ([statusCode, responseContract]) => {
      if (
        !responseContract ||
        !statusCode.startsWith('2') ||
        '$ref' in responseContract
      ) {
        return false;
      }

      return Boolean(responseContract.content?.['text/event-stream']);
    },
  );
}

// AI modified: preserve streamed success bodies without hiding JSON envelopes documented for errors on the same route.
function isNativeMediaResponse(
  responseContract: InlineOpenApiResponse,
): boolean {
  const content = responseContract.content;

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

function createApiEnvelopeSchema(
  statusCode: string,
  responseSchema: OpenApiResponseSchema | undefined,
): Exclude<OpenApiResponseSchema, { $ref: string }> {
  const numericStatusCode = Number(statusCode);
  const isSuccess =
    Number.isInteger(numericStatusCode) &&
    numericStatusCode >= 200 &&
    numericStatusCode < 300;

  return {
    type: 'object',
    additionalProperties: false,
    required: ['code', 'message', 'data', 'errors'],
    properties: {
      code: {
        type: 'integer',
        ...(Number.isInteger(numericStatusCode)
          ? { example: numericStatusCode }
          : {}),
      },
      message: {
        type: 'string',
        description: 'Localized response message',
      },
      data:
        isSuccess && responseSchema
          ? '$ref' in responseSchema
            ? { allOf: [responseSchema], nullable: true }
            : { ...responseSchema, nullable: true }
          : {
              nullable: true,
              example: null,
              description:
                'Business payload on success; failures and empty results use null',
            },
      errors: {
        type: 'array',
        nullable: true,
        description: 'Validation details, or null when none are available',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['field', 'reason'],
          properties: {
            field: { type: 'string' },
            reason: {
              type: 'string',
              description: 'Localized validation reason',
            },
          },
        },
      },
    },
  };
}

function isApiEnvelopeSchema(
  responseSchema: OpenApiResponseSchema | undefined,
): boolean {
  if (!responseSchema || '$ref' in responseSchema) {
    return false;
  }

  const properties = responseSchema.properties;

  return (
    Array.isArray(responseSchema.required) &&
    ['code', 'message', 'data', 'errors'].every((propertyName) =>
      responseSchema.required?.includes(propertyName),
    ) &&
    Boolean(
      properties?.code &&
      properties.message &&
      properties.data &&
      properties.errors,
    )
  );
}

// AI modified: CSRF is global middleware, so every generated unsafe operation must expose its live header contract.
export function applyCsrfOpenApiContract(
  document: OpenAPIObject,
  csrfService: Pick<CsrfService, 'getHeaderName' | 'isEnabled'>,
): void {
  if (!csrfService.isEnabled()) {
    return;
  }

  const headerName = csrfService.getHeaderName();

  for (const path of Object.values(document.paths)) {
    for (const method of unsafeHttpMethods) {
      const operation = path[method];

      if (!operation) {
        continue;
      }

      addCsrfHeader(operation, headerName);
      addCsrfForbiddenResponse(operation);
    }
  }
}

function addCsrfHeader(operation: OpenApiOperation, headerName: string): void {
  const parameters = operation.parameters ?? [];
  const hasConfiguredHeader = parameters.some(
    (parameter) =>
      !('$ref' in parameter) &&
      parameter.in === 'header' &&
      parameter.name.toLowerCase() === headerName.toLowerCase(),
  );

  if (hasConfiguredHeader) {
    return;
  }

  operation.parameters = [
    ...parameters,
    {
      name: headerName,
      in: 'header',
      required: true,
      // AI modified: keep the platform contract independent from removable Demo routes.
      description:
        'CSRF token obtained through the application-specific browser bootstrap flow when protection is enabled',
      schema: { type: 'string' },
    },
  ];
}

function addCsrfForbiddenResponse(operation: OpenApiOperation): void {
  const csrfDescription = 'CSRF token is missing or invalid';
  const forbiddenResponse = operation.responses['403'];

  if (!forbiddenResponse) {
    operation.responses['403'] = {
      description: csrfDescription,
    };
    return;
  }

  if (
    !('$ref' in forbiddenResponse) &&
    !forbiddenResponse.description.toLowerCase().includes('csrf')
  ) {
    forbiddenResponse.description = `${forbiddenResponse.description}; ${csrfDescription}`;
  }
}

export async function setupOpenApi(
  app: INestApplication,
  nodeEnv: Environment,
  metadataLoader: OpenApiPluginMetadataLoader = loadGeneratedOpenApiMetadata,
): Promise<void> {
  if (nodeEnv !== Environment.Development) {
    return;
  }

  // AI modified: SWC emits DTO metadata separately, so load it before scanning controllers.
  await SwaggerModule.loadPluginMetadata(await metadataLoader());
  const openApiConfig = new DocumentBuilder()
    .setTitle('gnester-lite API')
    .setDescription('NestJS template API reference')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);

  applyCsrfOpenApiContract(document, app.get(CsrfService));
  applyI18nOpenApiContract(document);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
