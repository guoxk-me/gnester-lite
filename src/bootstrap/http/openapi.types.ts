import type { SwaggerModule, OpenAPIObject } from '@nestjs/swagger';

export type OpenApiPluginMetadataFactory = Parameters<
  typeof SwaggerModule.loadPluginMetadata
>[0];

export type OpenApiPluginMetadataLoader =
  () => Promise<OpenApiPluginMetadataFactory>;

export type OpenApiPath = OpenAPIObject['paths'][string];

export type HttpMethod =
  'delete' | 'get' | 'head' | 'options' | 'patch' | 'post' | 'put' | 'trace';

export type UnsafeHttpMethod = 'delete' | 'patch' | 'post' | 'put';

export type OpenApiOperation = NonNullable<OpenApiPath[HttpMethod]> &
  Partial<Record<'x-skip-api-envelope', boolean>>;

export type OpenApiResponse = NonNullable<
  OpenApiOperation['responses'][string]
>;

export type InlineOpenApiResponse = Exclude<OpenApiResponse, { $ref: string }>;

export type OpenApiResponseSchema = NonNullable<
  NonNullable<
    NonNullable<InlineOpenApiResponse['content']>['application/json']
  >['schema']
>;
