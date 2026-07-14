// CN: 测试文件，验证 demo-websocket 的行为契约；EN: Test file verifies behavior contracts for demo-websocket.
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DemoWebsocketService } from './demo-websocket.service';

// CN: 测试分组：DemoWebsocketService；EN: Test group: DemoWebsocketService.
describe('DemoWebsocketService', () => {
  const jwtService: jest.Mocked<Pick<JwtService, 'verifyAsync'>> = {
    verifyAsync: jest.fn(),
  };
  let service: DemoWebsocketService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    jest.clearAllMocks();
    service = new DemoWebsocketService(jwtService as JwtService);
  });

  // CN: 测试用例：lists websocket scenarios with event names clients can subscribe to；EN: Test case: lists websocket scenarios with event names clients can subscribe to.
  it('lists websocket scenarios with event names clients can subscribe to', () => {
    expect(service.listScenarios()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventName: 'demo-websocket.ping',
          direction: 'client-to-server',
        }),
        expect.objectContaining({
          eventName: 'demo-websocket.room.join',
          direction: 'client-to-server',
        }),
        expect.objectContaining({
          eventName: 'demo-websocket.message',
          direction: 'server-to-client',
        }),
      ]),
    );
  });

  // CN: 测试用例：verifies bearer tokens before accepting a websocket connection；EN: Test case: verifies bearer tokens before accepting a websocket connection.
  it('verifies bearer tokens before accepting a websocket connection', async () => {
    const user = {
      sub: 'demo-admin',
      username: 'admin@example.com',
      roles: ['admin'],
    };
    jwtService.verifyAsync.mockResolvedValueOnce(user);

    await expect(service.verifyAccessToken('valid.jwt')).resolves.toEqual(user);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid.jwt');
  });

  // CN: 测试用例：rejects missing websocket tokens with an unauthorized error；EN: Test case: rejects missing websocket tokens with an unauthorized error.
  it('rejects missing websocket tokens with an unauthorized error', async () => {
    await expect(service.verifyAccessToken(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  // CN: 测试用例：tracks connected clients by socket id and authenticated user；EN: Test case: tracks connected clients by socket id and authenticated user.
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
