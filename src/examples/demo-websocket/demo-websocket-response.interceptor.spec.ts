import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { DEMO_WEBSOCKET_EVENTS } from './demo-websocket.constants';
import { DemoWebsocketResponseInterceptor } from './demo-websocket-response.interceptor';
import type { DemoWebsocketSocket } from './demo-websocket.gateway';

describe('DemoWebsocketResponseInterceptor', () => {
  let interceptor: DemoWebsocketResponseInterceptor;
  let client: {
    readonly id: string;
    readonly data: {
      readonly user?: {
        readonly sub: string;
        readonly username: string;
      };
    };
    readonly emit: jest.Mock;
  };

  beforeEach(() => {
    interceptor = new DemoWebsocketResponseInterceptor();
    client = {
      id: 'socket-1',
      data: {
        user: {
          sub: 'demo-admin',
          username: 'admin@example.com',
        },
      },
      emit: jest.fn(),
    };
  });

  it('passes websocket handler responses through unchanged and emits a trace event', async () => {
    const response = {
      event: DEMO_WEBSOCKET_EVENTS.Pong,
      data: {
        userId: 'demo-admin',
        message: 'alive',
      },
    };

    await expect(
      firstValueFrom(
        interceptor.intercept(
          createContext(client),
          createCallHandler(response),
        ),
      ),
    ).resolves.toEqual(response);

    expect(client.emit).toHaveBeenCalledWith(
      DEMO_WEBSOCKET_EVENTS.Intercepted,
      {
        event: DEMO_WEBSOCKET_EVENTS.Pong,
        socketId: 'socket-1',
        userId: 'demo-admin',
      },
    );
  });

  it('does not emit trace events for non websocket response payloads', async () => {
    await expect(
      firstValueFrom(
        interceptor.intercept(createContext(client), createCallHandler(null)),
      ),
    ).resolves.toBeNull();

    expect(client.emit).not.toHaveBeenCalled();
  });
});

function createContext(
  client: Pick<DemoWebsocketSocket, 'id' | 'data' | 'emit'>,
): ExecutionContext {
  return {
    switchToWs: () => ({
      getClient: () => client,
    }),
  } as unknown as ExecutionContext;
}

function createCallHandler<ResponseBody>(
  response: ResponseBody,
): CallHandler<ResponseBody> {
  return {
    handle: () => of(response),
  };
}
