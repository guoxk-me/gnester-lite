// CN: 测试文件，验证 demo-websocket 的行为契约；EN: Test file verifies behavior contracts for demo-websocket.
import type { ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { DemoWebsocketAuthenticatedGuard } from './demo-websocket-authenticated.guard';
import type { DemoWebsocketSocket } from './demo-websocket.gateway';

// CN: 测试分组：DemoWebsocketAuthenticatedGuard；EN: Test group: DemoWebsocketAuthenticatedGuard.
describe('DemoWebsocketAuthenticatedGuard', () => {
  let guard: DemoWebsocketAuthenticatedGuard;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    guard = new DemoWebsocketAuthenticatedGuard();
  });

  // CN: 测试用例：allows websocket events when the socket has an authenticated user；EN: Test case: allows websocket events when the socket has an authenticated user.
  it('allows websocket events when the socket has an authenticated user', () => {
    expect(
      guard.canActivate(
        createContext({
          data: {
            user: {
              sub: 'demo-admin',
              username: 'admin@example.com',
            },
          },
        }),
      ),
    ).toBe(true);
  });

  // CN: 测试用例：rejects websocket events without authenticated socket user context；EN: Test case: rejects websocket events without authenticated socket user context.
  it('rejects websocket events without authenticated socket user context', () => {
    expect(() =>
      guard.canActivate(
        createContext({
          data: {},
        }),
      ),
    ).toThrow(WsException);

    try {
      guard.canActivate(
        createContext({
          data: {},
        }),
      );
      throw new Error('Expected websocket guard to reject anonymous event.');
    } catch (error) {
      expect(error).toBeInstanceOf(WsException);
      expect((error as WsException).getError()).toEqual({
        code: 'WEBSOCKET_UNAUTHORIZED',
        message: 'Unauthorized websocket event',
      });
    }
  });

  // CN: 测试用例：rejects malformed websocket user context；EN: Test case: rejects malformed websocket user context.
  it('rejects malformed websocket user context', () => {
    expect(() =>
      guard.canActivate(
        createContext({
          data: {
            user: {
              sub: 'demo-admin',
            },
          },
        }),
      ),
    ).toThrow(WsException);
  });
});

// CN: 准备或验证 demo-websocket 的 create context 测试逻辑；EN: Prepares or verifies the create context test logic for demo-websocket.
function createContext(
  client: Pick<DemoWebsocketSocket, 'data'>,
): ExecutionContext {
  return {
    switchToWs: () => ({
      getClient: () => client,
    }),
  } as unknown as ExecutionContext;
}
