// CN: 守卫，保护 demo-websocket 的访问边界；EN: Guard protects access boundaries for demo-websocket.
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

import type { DemoWebsocketSocket } from './demo-websocket.gateway';

@Injectable()
export class DemoWebsocketAuthenticatedGuard implements CanActivate {
  // CN: 判断 demo-websocket 的 can activate 访问权限；EN: Checks can activate access for demo-websocket.
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<DemoWebsocketSocket>();

    if (isAuthenticatedSocket(client)) {
      return true;
    }

    throw new WsException({
      code: 'WEBSOCKET_UNAUTHORIZED',
      message: 'Unauthorized websocket event',
    });
  }
}

// CN: 判断 demo-websocket 的 is authenticated socket 访问权限；EN: Checks is authenticated socket access for demo-websocket.
function isAuthenticatedSocket(client: DemoWebsocketSocket): boolean {
  const { user } = client.data;

  return (
    typeof user?.sub === 'string' &&
    user.sub.length > 0 &&
    typeof user.username === 'string' &&
    user.username.length > 0
  );
}
