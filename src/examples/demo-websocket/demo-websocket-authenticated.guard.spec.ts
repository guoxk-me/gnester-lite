import type { ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type { JwtAuthenticatedUser } from '../../infra/auth/jwt-user.types.js';
import { DemoWebsocketAuthenticatedGuard } from './demo-websocket-authenticated.guard.js';
import type { DemoWebsocketSocket } from './demo-websocket.gateway.js';

describe('DemoWebsocketAuthenticatedGuard', () => {
  let guard: DemoWebsocketAuthenticatedGuard;

  beforeEach(() => {
    guard = new DemoWebsocketAuthenticatedGuard();
  });

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

  it('rejects malformed websocket user context', () => {
    expect(() =>
      guard.canActivate(
        createContext({
          data: {
            user: {
              sub: 'demo-admin',
            } as unknown as JwtAuthenticatedUser,
          },
        }),
      ),
    ).toThrow(WsException);
  });
});

function createContext(
  client: Pick<DemoWebsocketSocket, 'data'>,
): ExecutionContext {
  return {
    switchToWs: () => ({
      getClient: () => client,
    }),
  } as unknown as ExecutionContext;
}
