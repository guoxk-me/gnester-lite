import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

import { DEMO_WEBSOCKET_EVENTS } from './demo-websocket.constants';
import type { DemoWebsocketSocket } from './demo-websocket.gateway';

interface DemoWebsocketResponse {
  readonly event: string;
  readonly data: unknown;
}

@Injectable()
export class DemoWebsocketResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const client = context.switchToWs().getClient<DemoWebsocketSocket>();

    return next.handle().pipe(
      tap((response) => {
        if (!isDemoWebsocketResponse(response)) {
          return;
        }

        client.emit(DEMO_WEBSOCKET_EVENTS.Intercepted, {
          event: response.event,
          socketId: client.id,
          userId: client.data.user?.sub ?? null,
        });
      }),
    );
  }
}

function isDemoWebsocketResponse(
  value: unknown,
): value is DemoWebsocketResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'event' in value &&
    typeof value.event === 'string' &&
    'data' in value
  );
}
