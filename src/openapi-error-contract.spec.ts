import { RequestMethod } from '@nestjs/common';
import { HTTP_CODE_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger';

import { HealthController } from './platform/operations/health/health.controller';
import { DemoCacheController } from './examples/demo-cache/demo-cache.controller';
import { DemoDatabaseController } from './examples/demo-database/demo-database.controller';
import { DemoHttpController } from './examples/demo-http/demo-http.controller';
import { DemoQueueController } from './examples/demo-queue/demo-queue.controller';
import { DemoSentryController } from './examples/demo-sentry/demo-sentry.controller';
import { DemoStreamingFilesController } from './examples/demo-streaming-files/demo-streaming-files.controller';
import { DemoUploadController } from './examples/demo-upload/demo-upload.controller';

interface ControllerClass {
  readonly prototype: object;
}

interface OpenApiErrorContract {
  readonly label: string;
  readonly controller: ControllerClass;
  readonly methodName: string;
  readonly statuses: readonly number[];
}

// AI modified: keep feature-specific runtime failures visible in the generated API contract.
const openApiErrorContracts: readonly OpenApiErrorContract[] = [
  {
    label: 'health readiness',
    controller: HealthController,
    methodName: 'checkReadiness',
    statuses: [503],
  },
  {
    label: 'cache create',
    controller: DemoCacheController,
    methodName: 'create',
    statuses: [409, 503],
  },
  {
    label: 'cache list',
    controller: DemoCacheController,
    methodName: 'findAll',
    statuses: [503],
  },
  {
    label: 'cache read',
    controller: DemoCacheController,
    methodName: 'findOne',
    statuses: [404, 503],
  },
  {
    label: 'cache update',
    controller: DemoCacheController,
    methodName: 'update',
    statuses: [404, 409, 503],
  },
  {
    label: 'cache delete',
    controller: DemoCacheController,
    methodName: 'remove',
    statuses: [404, 503],
  },
  {
    label: 'database raw bulk create',
    controller: DemoDatabaseController,
    methodName: 'createMany',
    statuses: [400],
  },
  {
    label: 'database id list',
    controller: DemoDatabaseController,
    methodName: 'findManyByIds',
    statuses: [400],
  },
  {
    label: 'database read',
    controller: DemoDatabaseController,
    methodName: 'findOne',
    statuses: [404],
  },
  {
    label: 'database description update',
    controller: DemoDatabaseController,
    methodName: 'updateDescription',
    statuses: [404],
  },
  {
    label: 'database update',
    controller: DemoDatabaseController,
    methodName: 'update',
    statuses: [404],
  },
  {
    label: 'database delete',
    controller: DemoDatabaseController,
    methodName: 'remove',
    statuses: [404],
  },
  {
    label: 'HTTP provider status',
    controller: DemoHttpController,
    methodName: 'getProviderStatus',
    statuses: [502, 504],
  },
  {
    label: 'HTTP post list',
    controller: DemoHttpController,
    methodName: 'findPosts',
    statuses: [502, 504],
  },
  {
    label: 'HTTP post read',
    controller: DemoHttpController,
    methodName: 'findPost',
    statuses: [502, 504],
  },
  {
    label: 'HTTP post create',
    controller: DemoHttpController,
    methodName: 'createPost',
    statuses: [502, 504],
  },
  {
    label: 'queue email',
    controller: DemoQueueController,
    methodName: 'enqueueEmail',
    statuses: [503],
  },
  {
    label: 'queue long task',
    controller: DemoQueueController,
    methodName: 'enqueueLongTask',
    statuses: [503],
  },
  {
    label: 'queue workflow',
    controller: DemoQueueController,
    methodName: 'enqueueSubtaskWorkflow',
    statuses: [503],
  },
  {
    label: 'queue status',
    controller: DemoQueueController,
    methodName: 'getStatus',
    statuses: [503],
  },
  {
    label: 'queue pause',
    controller: DemoQueueController,
    methodName: 'pause',
    statuses: [503],
  },
  {
    label: 'queue resume',
    controller: DemoQueueController,
    methodName: 'resume',
    statuses: [503],
  },
  {
    label: 'Sentry debug failure',
    controller: DemoSentryController,
    methodName: 'getDebugSentry',
    statuses: [500],
  },
  {
    label: 'package.json download',
    controller: DemoStreamingFilesController,
    methodName: 'downloadPackageJson',
    statuses: [404],
  },
  {
    label: 'README preview',
    controller: DemoStreamingFilesController,
    methodName: 'previewReadme',
    statuses: [404],
  },
  {
    label: 'chunked upload session creation',
    controller: DemoUploadController,
    methodName: 'createChunkedUploadSession',
    statuses: [400, 503],
  },
  {
    label: 'chunk upload',
    controller: DemoUploadController,
    methodName: 'receiveChunk',
    statuses: [400, 404, 409, 410, 413, 422, 503],
  },
  {
    label: 'chunked upload status',
    controller: DemoUploadController,
    methodName: 'getChunkedUploadSession',
    statuses: [400, 404, 410, 503],
  },
  {
    label: 'chunked upload completion',
    controller: DemoUploadController,
    methodName: 'completeChunkedUpload',
    statuses: [400, 404, 409, 410, 422, 503],
  },
  {
    label: 'chunked upload cancellation',
    controller: DemoUploadController,
    methodName: 'cancelChunkedUpload',
    statuses: [400, 404, 503],
  },
  {
    label: 'single-file upload',
    controller: DemoUploadController,
    methodName: 'uploadSingleFile',
    statuses: [413, 422],
  },
  {
    label: 'image upload',
    controller: DemoUploadController,
    methodName: 'uploadImageFile',
    statuses: [413, 422],
  },
  {
    label: 'file-array upload',
    controller: DemoUploadController,
    methodName: 'uploadFileArray',
    statuses: [400, 413, 422],
  },
  {
    label: 'profile asset upload',
    controller: DemoUploadController,
    methodName: 'uploadProfileAssets',
    statuses: [400, 413, 422],
  },
  {
    label: 'arbitrary-field upload',
    controller: DemoUploadController,
    methodName: 'uploadAnyFiles',
    statuses: [400, 413, 422],
  },
  {
    label: 'multipart form',
    controller: DemoUploadController,
    methodName: 'handleMultipartForm',
    statuses: [400],
  },
];

describe('feature OpenAPI error contracts', () => {
  it.each(openApiErrorContracts)(
    'documents $label failures',
    ({ controller, methodName, statuses }) => {
      expect(getDocumentedErrorStatuses(controller, methodName)).toEqual(
        statuses,
      );
    },
  );

  it.each(
    openApiErrorContracts.filter(
      ({ controller, methodName }) =>
        controller !== DemoSentryController || methodName !== 'getDebugSentry',
    ),
  )('preserves the $label success response', ({ controller, methodName }) => {
    expect(getDocumentedSuccessStatuses(controller, methodName)).toEqual([
      getExpectedSuccessStatus(controller, methodName),
    ]);
  });
});

function getDocumentedErrorStatuses(
  controller: ControllerClass,
  methodName: string,
): number[] {
  return getDocumentedResponseStatuses(controller, methodName).filter(
    (status) => status >= 400,
  );
}

function getDocumentedSuccessStatuses(
  controller: ControllerClass,
  methodName: string,
): number[] {
  return getDocumentedResponseStatuses(controller, methodName).filter(
    (status) => status >= 200 && status < 300,
  );
}

function getDocumentedResponseStatuses(
  controller: ControllerClass,
  methodName: string,
): number[] {
  const handler = getControllerHandler(controller, methodName);
  const responses = Reflect.getMetadata(DECORATORS.API_RESPONSE, handler) as
    | Record<string, unknown>
    | undefined;

  return Object.keys(responses ?? {})
    .map(Number)
    .sort((left, right) => left - right);
}

function getExpectedSuccessStatus(
  controller: ControllerClass,
  methodName: string,
): number {
  const handler = getControllerHandler(controller, methodName);
  const declaredStatus = Reflect.getMetadata(HTTP_CODE_METADATA, handler) as
    | number
    | undefined;

  if (declaredStatus !== undefined) {
    return declaredStatus;
  }

  const requestMethod = Reflect.getMetadata(
    METHOD_METADATA,
    handler,
  ) as RequestMethod;

  return requestMethod === RequestMethod.POST ? 201 : 200;
}

function getControllerHandler(
  controller: ControllerClass,
  methodName: string,
): (...arguments_: unknown[]) => unknown {
  const handler = Object.getOwnPropertyDescriptor(
    controller.prototype,
    methodName,
  )?.value as unknown;

  if (typeof handler !== 'function') {
    throw new Error(`Controller method "${methodName}" was not found`);
  }

  return handler as (...arguments_: unknown[]) => unknown;
}
