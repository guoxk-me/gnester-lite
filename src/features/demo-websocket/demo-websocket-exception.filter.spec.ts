// CN: 测试文件，验证 demo-websocket 的行为契约；EN: Test file verifies behavior contracts for demo-websocket.
import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { WsException } from '@nestjs/websockets';
import { DemoWebsocketExceptionFilter } from './demo-websocket-exception.filter';

jest.mock('@sentry/nestjs', () => ({
  captureException: jest.fn(),
}));

// CN: 测试分组：DemoWebsocketExceptionFilter；EN: Test group: DemoWebsocketExceptionFilter.
describe('DemoWebsocketExceptionFilter', () => {
  let filter: DemoWebsocketExceptionFilter;
  let client: {
    readonly emit: jest.Mock;
  };

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    filter = new DemoWebsocketExceptionFilter();
    client = {
      emit: jest.fn(),
    };
    jest.clearAllMocks();
  });

  // CN: 测试用例：emits validation failures with field-level details for websocket clients；EN: Test case: emits validation failures with field-level details for websocket clients.
  it('emits validation failures with field-level details for websocket clients', () => {
    filter.catch(
      new BadRequestException({
        code: 400,
        message: 'Validation failed',
        errors: [
          {
            field: 'room',
            reason: 'room must be shorter than or equal to 80 characters',
          },
        ],
      }),
      createHost(client),
    );

    expect(client.emit).toHaveBeenCalledWith('demo-websocket.exception', {
      code: 'WEBSOCKET_VALIDATION_FAILED',
      message: 'Validation failed',
      errors: [
        {
          field: 'room',
          reason: 'room must be shorter than or equal to 80 characters',
        },
      ],
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  // CN: 测试用例：emits WsException payloads without rewriting stable application codes；EN: Test case: emits WsException payloads without rewriting stable application codes.
  it('emits WsException payloads without rewriting stable application codes', () => {
    filter.catch(
      new WsException({
        code: 'WEBSOCKET_UNAUTHORIZED',
        message: 'Unauthorized websocket event',
      }),
      createHost(client),
    );

    expect(client.emit).toHaveBeenCalledWith('demo-websocket.exception', {
      code: 'WEBSOCKET_UNAUTHORIZED',
      message: 'Unauthorized websocket event',
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  // CN: 测试用例：preserves WsException validation details emitted by websocket pipes；EN: Test case: preserves WsException validation details emitted by websocket pipes.
  it('preserves WsException validation details emitted by websocket pipes', () => {
    filter.catch(
      new WsException({
        code: 'WEBSOCKET_VALIDATION_FAILED',
        message: 'Validation failed',
        errors: [
          {
            field: 'room',
            reason: 'room must match /^[a-zA-Z0-9:_-]+$/ regular expression',
          },
        ],
      }),
      createHost(client),
    );

    expect(client.emit).toHaveBeenCalledWith('demo-websocket.exception', {
      code: 'WEBSOCKET_VALIDATION_FAILED',
      message: 'Validation failed',
      errors: [
        {
          field: 'room',
          reason: 'room must match /^[a-zA-Z0-9:_-]+$/ regular expression',
        },
      ],
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  // CN: 测试用例：does not leak unexpected Error messages to websocket clients；EN: Test case: does not leak unexpected Error messages to websocket clients.
  it('does not leak unexpected Error messages to websocket clients', () => {
    const unexpectedError = new Error('database password leaked');

    filter.catch(unexpectedError, createHost(client));

    expect(client.emit).toHaveBeenCalledWith('demo-websocket.exception', {
      code: 'WEBSOCKET_INTERNAL_ERROR',
      message: 'Internal websocket error',
    });
    expect(Sentry.captureException).toHaveBeenCalledWith(unexpectedError);
  });
});

// CN: 准备或验证 demo-websocket 的 create host 测试逻辑；EN: Prepares or verifies the create host test logic for demo-websocket.
function createHost(client: { readonly emit: jest.Mock }): ArgumentsHost {
  return {
    switchToWs: () => ({
      getClient: () => client,
    }),
  } as unknown as ArgumentsHost;
}
