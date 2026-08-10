import { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';

import { Environment } from 'config/config.types';
import { CsrfService } from '../../platform/security/csrf/csrf.service';

type OpenApiPluginMetadataFactory = Parameters<
  typeof SwaggerModule.loadPluginMetadata
>[0];

export type OpenApiPluginMetadataLoader =
  () => Promise<OpenApiPluginMetadataFactory>;

type OpenApiPath = OpenAPIObject['paths'][string];
type UnsafeHttpMethod = 'delete' | 'patch' | 'post' | 'put';
type OpenApiOperation = NonNullable<OpenApiPath[UnsafeHttpMethod]>;

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
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
