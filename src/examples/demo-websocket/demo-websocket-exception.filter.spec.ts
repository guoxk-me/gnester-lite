import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { WsException } from '@nestjs/websockets';
import { DEMO_WEBSOCKET_EVENTS } from './demo-websocket.constants';
import { DemoWebsocketExceptionFilter } from './demo-websocket-exception.filter';

jest.mock('@sentry/nestjs', () => ({
  captureException: jest.fn(),
}));

describe('DemoWebsocketExceptionFilter', () => {
  let filter: DemoWebsocketExceptionFilter;
  let client: {
    readonly emit: jest.Mock;
  };

  beforeEach(() => {
    filter = new DemoWebsocketExceptionFilter();
    client = {
      emit: jest.fn(),
    };
    jest.clearAllMocks();
  });

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

    expect(client.emit).toHaveBeenCalledWith(DEMO_WEBSOCKET_EVENTS.Exception, {
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

  it('emits room-membership WsExceptions on the handler exception event', () => {
    filter.catch(
      new WsException({
        code: 'WEBSOCKET_ROOM_MEMBERSHIP_REQUIRED',
        message: 'Join the room before sending messages',
      }),
      createHost(client),
    );

    expect(client.emit).toHaveBeenCalledWith(DEMO_WEBSOCKET_EVENTS.Exception, {
      code: 'WEBSOCKET_ROOM_MEMBERSHIP_REQUIRED',
      message: 'Join the room before sending messages',
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

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

    expect(client.emit).toHaveBeenCalledWith(DEMO_WEBSOCKET_EVENTS.Exception, {
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

  it('does not leak unexpected Error messages to websocket clients', () => {
    const unexpectedError = new Error('database password leaked');

    filter.catch(unexpectedError, createHost(client));

    expect(client.emit).toHaveBeenCalledWith(DEMO_WEBSOCKET_EVENTS.Exception, {
      code: 'WEBSOCKET_INTERNAL_ERROR',
      message: 'Internal websocket error',
    });
    expect(Sentry.captureException).toHaveBeenCalledWith(unexpectedError);
  });
});

function createHost(client: { readonly emit: jest.Mock }): ArgumentsHost {
  return {
    switchToWs: () => ({
      getClient: () => client,
    }),
  } as unknown as ArgumentsHost;
}
