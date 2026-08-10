import { INestApplication } from '@nestjs/common';
import { type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

import { Environment } from 'config/config.types';
import { CsrfService } from '../../platform/security/csrf/csrf.service';
import { applyCsrfOpenApiContract, setupOpenApi } from './openapi.config';

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
    expect(JSON.stringify(document)).not.toContain('/demo-');
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

function createOpenApiDocument(): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: {
      title: 'OpenAPI test',
      version: '1.0',
    },
    paths: {
      '/resource': {
        get: {
          responses: {
            200: { description: 'OK' },
          },
        },
        post: {
          responses: {
            201: { description: 'Created' },
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
    },
  };
}
