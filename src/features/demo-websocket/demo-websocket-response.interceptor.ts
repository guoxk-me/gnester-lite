// CN: 拦截器，调整 demo-websocket 的请求或响应流程；EN: Interceptor adjusts request or response flow for demo-websocket.
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

import type { DemoWebsocketSocket } from './demo-websocket.gateway';

interface DemoWebsocketResponse {
  readonly event: string;
  readonly data: unknown;
}

@Injectable()
export class DemoWebsocketResponseInterceptor implements NestInterceptor {
  // CN: 拦截并整理 demo-websocket 的 intercept 响应流程；EN: Intercepts and shapes the intercept response flow for demo-websocket.
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const client = context.switchToWs().getClient<DemoWebsocketSocket>();

    return next.handle().pipe(
      tap((response) => {
        if (!isDemoWebsocketResponse(response)) {
          return;
        }

        client.emit('demo-websocket.intercepted', {
          event: response.event,
          socketId: client.id,
          userId: client.data.user?.sub ?? null,
        });
      }),
    );
  }
}

// CN: 拦截并整理 demo-websocket 的 is demo websocket response 响应流程；EN: Intercepts and shapes the is demo websocket response response flow for demo-websocket.
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
