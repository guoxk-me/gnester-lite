import { UnauthorizedException } from '@nestjs/common';
import { AuthTokenService } from '../../platform/security/auth/auth-token.service';
import { DEMO_WEBSOCKET_EVENTS } from './demo-websocket.constants';
import { DemoWebsocketService } from './demo-websocket.service';

describe('DemoWebsocketService', () => {
  const authTokenService: jest.Mocked<
    Pick<AuthTokenService, 'verifyAccessToken'>
  > = {
    verifyAccessToken: jest.fn(),
  };
  let service: DemoWebsocketService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DemoWebsocketService(
      authTokenService as unknown as AuthTokenService,
    );
  });

  it('lists websocket scenarios with event names clients can subscribe to', () => {
    expect(service.listScenarios()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventName: DEMO_WEBSOCKET_EVENTS.Ping,
          direction: 'client-to-server',
        }),
        expect.objectContaining({
          eventName: DEMO_WEBSOCKET_EVENTS.RoomJoin,
          direction: 'client-to-server',
        }),
        expect.objectContaining({
          eventName: DEMO_WEBSOCKET_EVENTS.RoomMessage,
          direction: 'server-to-client',
        }),
      ]),
    );
  });

  it('verifies bearer tokens before accepting a websocket connection', async () => {
    const user = {
      sub: 'demo-admin',
      username: 'admin@example.com',
      roles: ['admin'],
    };
    authTokenService.verifyAccessToken.mockResolvedValueOnce(user);

    await expect(service.verifyAccessToken('valid.jwt')).resolves.toEqual(user);
    expect(authTokenService.verifyAccessToken).toHaveBeenCalledWith(
      'valid.jwt',
    );
  });

  it('rejects missing websocket tokens with an unauthorized error', async () => {
    await expect(service.verifyAccessToken(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(authTokenService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('tracks connected clients by socket id and authenticated user', () => {
    service.registerConnection('socket-1', {
      sub: 'demo-admin',
      username: 'admin@example.com',
    });

    expect(service.getConnectionSnapshot()).toEqual([
      {
        socketId: 'socket-1',
        userId: 'demo-admin',
        username: 'admin@example.com',
      },
    ]);

    service.removeConnection('socket-1');

    expect(service.getConnectionSnapshot()).toEqual([]);
  });
});
