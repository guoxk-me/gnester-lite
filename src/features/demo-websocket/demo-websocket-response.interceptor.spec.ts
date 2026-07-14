// CN: 测试文件，验证 demo-websocket 的行为契约；EN: Test file verifies behavior contracts for demo-websocket.
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { DemoWebsocketResponseInterceptor } from './demo-websocket-response.interceptor';
import type { DemoWebsocketSocket } from './demo-websocket.gateway';

// CN: 测试分组：DemoWebsocketResponseInterceptor；EN: Test group: DemoWebsocketResponseInterceptor.
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

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
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

  // CN: 测试用例：passes websocket handler responses through unchanged and emits a trace event；EN: Test case: passes websocket handler responses through unchanged and emits a trace event.
  it('passes websocket handler responses through unchanged and emits a trace event', async () => {
    const response = {
      event: 'demo-websocket.pong',
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

    expect(client.emit).toHaveBeenCalledWith('demo-websocket.intercepted', {
      event: 'demo-websocket.pong',
      socketId: 'socket-1',
      userId: 'demo-admin',
    });
  });

  // CN: 测试用例：does not emit trace events for non websocket response payloads；EN: Test case: does not emit trace events for non websocket response payloads.
  it('does not emit trace events for non websocket response payloads', async () => {
    await expect(
      firstValueFrom(
        interceptor.intercept(createContext(client), createCallHandler(null)),
      ),
    ).resolves.toBeNull();

    expect(client.emit).not.toHaveBeenCalled();
  });
});

// CN: 准备或验证 demo-websocket 的 create context 测试逻辑；EN: Prepares or verifies the create context test logic for demo-websocket.
function createContext(
  client: Pick<DemoWebsocketSocket, 'id' | 'data' | 'emit'>,
): ExecutionContext {
  return {
    switchToWs: () => ({
      getClient: () => client,
    }),
  } as unknown as ExecutionContext;
}

// CN: 准备或验证 demo-websocket 的 create call handler 测试逻辑；EN: Prepares or verifies the create call handler test logic for demo-websocket.
function createCallHandler<T>(response: T): CallHandler<T> {
  return {
    handle: () => of(response),
  };
}
