import { INestApplication } from '@nestjs/common';
import { type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

import { Environment } from 'config/config.types';
import { SKIP_API_ENVELOPE_OPENAPI_EXTENSION } from '../../platform/runtime/i18n/i18n.constants';
import { CsrfService } from '../../platform/security/csrf/csrf.service';
import {
  applyCsrfOpenApiContract,
  applyI18nOpenApiContract,
  setupOpenApi,
} from './openapi.config';

describe('setupOpenApi', () => {
  const csrfService: jest.Mocked<
    Pick<CsrfService, 'getHeaderName' | 'isEnabled'>
  > = {
    getHeaderName: jest.fn(),
    isEnabled: jest.fn(),
  };
  const getProvider = jest.fn();
  const app = {
    get: getProvider,
  } as unknown as INestApplication;

  beforeEach(() => {
    jest.clearAllMocks();
    csrfService.getHeaderName.mockReturnValue('x-csrf-token');
    csrfService.isEnabled.mockReturnValue(true);
    getProvider.mockReturnValue(csrfService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads generated metadata before registering development documentation', async () => {
    const document = createOpenApiDocument();
    const metadataFactory = () => Promise.resolve({});
    const metadataLoader = jest.fn(() => Promise.resolve(metadataFactory));
    const loadPluginMetadata = jest
      .spyOn(SwaggerModule, 'loadPluginMetadata')
      .mockResolvedValue();
    const createDocument = jest
      .spyOn(SwaggerModule, 'createDocument')
      .mockReturnValue(document as never);
    const setup = jest.spyOn(SwaggerModule, 'setup').mockImplementation();

    await setupOpenApi(app, Environment.Development, metadataLoader);

    expect(metadataLoader).toHaveBeenCalledTimes(1);
    expect(loadPluginMetadata).toHaveBeenCalledWith(metadataFactory);
    expect(createDocument).toHaveBeenCalledWith(app, expect.any(Object));
    expect(getProvider).toHaveBeenCalledWith(CsrfService);
    expect(setup).toHaveBeenCalledWith('docs', app, document, {
      jsonDocumentUrl: 'docs-json',
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    expect(loadPluginMetadata.mock.invocationCallOrder[0]).toBeLessThan(
      createDocument.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('does not load metadata or expose OpenAPI in production', async () => {
    const metadataLoader = jest.fn();
    const loadPluginMetadata = jest.spyOn(SwaggerModule, 'loadPluginMetadata');
    const createDocument = jest.spyOn(SwaggerModule, 'createDocument');
    const setup = jest.spyOn(SwaggerModule, 'setup');

    await setupOpenApi(app, Environment.Production, metadataLoader);

    expect(metadataLoader).not.toHaveBeenCalled();
    expect(loadPluginMetadata).not.toHaveBeenCalled();
    expect(createDocument).not.toHaveBeenCalled();
    expect(setup).not.toHaveBeenCalled();
    expect(getProvider).not.toHaveBeenCalled();
  });
});

describe('applyCsrfOpenApiContract', () => {
  it('adds one configured CSRF header and 403 response to every unsafe operation', () => {
    const document = createOpenApiDocument();
    const csrfService = {
      getHeaderName: () => 'x-custom-csrf',
      isEnabled: () => true,
    };

    applyCsrfOpenApiContract(document, csrfService);
    applyCsrfOpenApiContract(document, csrfService);

    const path = document.paths['/resource'];

    for (const method of ['post', 'put', 'patch', 'delete'] as const) {
      const operation = path[method];
      const csrfHeaders = operation?.parameters?.filter(
        (parameter) =>
          !('$ref' in parameter) &&
          parameter.in === 'header' &&
          parameter.name === 'x-custom-csrf',
      );

      expect(csrfHeaders).toHaveLength(1);
      const csrfHeader = csrfHeaders?.[0];

      if (!csrfHeader || '$ref' in csrfHeader) {
        throw new Error('Expected an inline CSRF header parameter');
      }

      expect(csrfHeader).toMatchObject({
        required: true,
        schema: { type: 'string' },
      });
      // AI modified: keep bootstrap documentation independent of an optional Demo route.
      expect(csrfHeader.description).not.toContain('/demo-');
      expect(operation?.responses['403']).toBeDefined();
    }

    expect(path.get?.parameters).toBeUndefined();
    expect(path.get?.responses['403']).toBeUndefined();
    const patchForbiddenResponse = path.patch?.responses['403'];

    if (!patchForbiddenResponse || '$ref' in patchForbiddenResponse) {
      throw new Error('Expected an inline PATCH 403 response');
    }

    expect(patchForbiddenResponse.description).toContain('CSRF');
    expect(JSON.stringify(path)).not.toContain('/demo-');
  });

  it('does not add a CSRF header or response while protection is disabled', () => {
    const document = createOpenApiDocument();

    applyCsrfOpenApiContract(document, {
      getHeaderName: () => 'x-csrf-token',
      isEnabled: () => false,
    });

    for (const method of ['post', 'put', 'patch', 'delete'] as const) {
      expect(document.paths['/resource'][method]?.parameters).toBeUndefined();
      expect(
        document.paths['/resource'][method]?.responses['403'],
      ).toBeUndefined();
    }
  });
});

describe('applyI18nOpenApiContract', () => {
  it('documents language negotiation and wraps JSON response schemas once', () => {
    const document = createOpenApiDocument();

    applyI18nOpenApiContract(document);
    applyI18nOpenApiContract(document);

    for (const [routePath, pathContract] of Object.entries(document.paths)) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
        const operation = pathContract[method];

        if (!operation) {
          continue;
        }

        const languageHeaders = operation.parameters?.filter(
          (parameter) =>
            !('$ref' in parameter) &&
            parameter.in === 'header' &&
            parameter.name === 'Accept-Language',
        );

        const isRawOperation =
          (SKIP_API_ENVELOPE_OPENAPI_EXTENSION in operation &&
            operation[SKIP_API_ENVELOPE_OPENAPI_EXTENSION] === true) ||
          routePath === '/api/auth/get-session' ||
          routePath === '/demo-sse/notifications';

        if (isRawOperation) {
          expect(languageHeaders ?? []).toHaveLength(0);
          continue;
        }

        expect(languageHeaders).toHaveLength(1);
        expect(languageHeaders?.[0]).toMatchObject({
          required: false,
          schema: {
            type: 'string',
            example: 'zh-CN, zh;q=0.9, en;q=0.8',
          },
        });
        expect(languageHeaders?.[0]).not.toHaveProperty('schema.enum');
      }
    }

    const successSchema = responseContent(
      document,
      '/resource',
      'get',
      '200',
    )?.['application/json']?.schema;

    expect(successSchema).toMatchObject({
      type: 'object',
      required: ['code', 'message', 'data', 'errors'],
      properties: {
        code: { type: 'integer', example: 200 },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: { id: { type: 'string' } },
          nullable: true,
        },
        errors: { type: 'array', nullable: true },
      },
    });

    const errorSchema = responseContent(document, '/resource', 'post', '400')?.[
      'application/json'
    ]?.schema;

    expect(errorSchema).toMatchObject({
      type: 'object',
      properties: {
        code: { example: 400 },
        data: { nullable: true, example: null },
        errors: {
          items: {
            required: ['field', 'reason'],
          },
        },
      },
    });

    const successResponse = document.paths['/resource'].get?.responses['200'];

    if (!successResponse || '$ref' in successResponse) {
      throw new Error('Expected an inline localized success response');
    }

    expect(successResponse.headers).toMatchObject({
      'Content-Language': {
        schema: { type: 'string', enum: ['en', 'zh'] },
      },
      Vary: {
        schema: { type: 'string', example: 'Accept-Language' },
      },
    });
  });

  it('preserves probe, streaming, file, raw auth, and no-content responses', () => {
    const document = createOpenApiDocument();

    applyI18nOpenApiContract(document);

    expect(
      responseContent(document, '/health/live', 'get', '200')?.[
        'application/json'
      ]?.schema,
    ).toMatchObject({ properties: { status: { type: 'string' } } });
    expect(
      responseContent(document, '/demo-sse/notifications', 'get', '200'),
    ).toEqual({
      'text/event-stream': { schema: { type: 'string' } },
    });
    expect(
      responseContent(document, '/demo-streaming-files/report', 'get', '200'),
    ).toEqual({
      'text/csv': { schema: { type: 'string', format: 'binary' } },
    });
    expect(
      responseContent(document, '/demo-streaming-files/report', 'get', '404')?.[
        'application/json'
      ]?.schema,
    ).toMatchObject({
      type: 'object',
      properties: {
        code: { example: 404 },
        data: { nullable: true, example: null },
      },
    });
    expect(
      responseContent(document, '/api/auth/get-session', 'get', '200')?.[
        'application/json'
      ]?.schema,
    ).toEqual({ type: 'object' });
    expect(
      responseContent(document, '/resource', 'delete', '204'),
    ).toBeUndefined();
  });
});

function responseContent(
  document: OpenAPIObject,
  path: string,
  method: 'delete' | 'get' | 'patch' | 'post' | 'put',
  status: string,
): Exclude<
  NonNullable<
    NonNullable<
      OpenAPIObject['paths'][string][typeof method]
    >['responses'][string]
  >,
  { $ref: string }
>['content'] {
  const response = document.paths[path]?.[method]?.responses[status];

  if (!response || '$ref' in response) {
    throw new Error(
      `Expected inline OpenAPI response ${method.toUpperCase()} ${path} ${status}`,
    );
  }

  return response.content;
}

function createOpenApiDocument(): OpenAPIObject {
  const document: OpenAPIObject = {
    openapi: '3.0.0',
    info: {
      title: 'OpenAPI test',
      version: '1.0',
    },
    paths: {
      '/resource': {
        get: {
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { id: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
        post: {
          responses: {
            201: { description: 'Created' },
            400: { description: 'Invalid request' },
          },
        },
        put: {
          responses: {
            200: { description: 'Updated' },
          },
        },
        patch: {
          responses: {
            200: { description: 'Updated' },
          },
        },
        delete: {
          responses: {
            204: { description: 'Deleted' },
          },
        },
      },
      '/health/live': {
        get: {
          responses: {
            200: {
              description: 'Healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { status: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
      '/demo-sse/notifications': {
        get: {
          responses: {
            200: {
              description: 'SSE stream',
              content: {
                'text/event-stream': { schema: { type: 'string' } },
              },
            },
          },
        },
      },
      '/demo-streaming-files/report': {
        get: {
          responses: {
            200: {
              description: 'File download',
              content: {
                'text/csv': {
                  schema: { type: 'string', format: 'binary' },
                },
              },
            },
            404: {
              description: 'Report was not found',
            },
          },
        },
      },
      '/api/auth/get-session': {
        get: {
          responses: {
            200: {
              description: 'Raw Better Auth response',
              content: {
                'application/json': { schema: { type: 'object' } },
              },
            },
          },
        },
      },
    },
  };

  const healthOperation = document.paths['/health/live'].get;

  if (!healthOperation) {
    throw new Error('Expected a health operation in the OpenAPI fixture');
  }

  Object.assign(healthOperation, {
    [SKIP_API_ENVELOPE_OPENAPI_EXTENSION]: true,
  });

  return document;
}
