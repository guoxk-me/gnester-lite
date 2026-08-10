import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

import type { DemoWebsocketSocket } from './demo-websocket.gateway';

@Injectable()
export class DemoWebsocketAuthenticatedGuard implements CanActivate {
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

function isAuthenticatedSocket(client: DemoWebsocketSocket): boolean {
  const { user } = client.data;

  return (
    typeof user?.sub === 'string' &&
    user.sub.length > 0 &&
    typeof user.username === 'string' &&
    user.username.length > 0
  );
}
