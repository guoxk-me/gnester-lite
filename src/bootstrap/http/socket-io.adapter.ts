import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { IncomingMessage } from 'node:http';
import type { ServerOptions } from 'socket.io';

export type SocketIoServerOptions = Partial<ServerOptions> & {
  readonly namespace?: string;
  readonly server?: unknown;
};

export class SocketIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly defaultCorsOptions: ServerOptions['cors'] | false = false,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: SocketIoServerOptions): unknown {
    return super.createIOServer(port, this.resolveServerOptions(options));
  }

  resolveServerOptions(
    options: SocketIoServerOptions = {},
  ): SocketIoServerOptions {
    const {
      allowRequest: gatewayAllowRequest,
      cors: gatewayCorsOptions,
      ...gatewayOptions
    } = options;
    const originPolicy = gatewayCorsOptions ?? this.defaultCorsOptions;
    const corsOptions = originPolicy === false ? undefined : originPolicy;

    return {
      ...gatewayOptions,
      ...(corsOptions === undefined ? {} : { cors: corsOptions }),
      // AI modified: Engine.IO allowRequest protects websocket-only handshakes that CORS headers do not block.
      allowRequest:
        gatewayAllowRequest ?? createSocketOriginAllowRequest(originPolicy),
      serveClient: gatewayOptions.serveClient ?? false,
      transports: gatewayOptions.transports ?? ['websocket'],
    };
  }
}

type SocketAllowRequest = NonNullable<ServerOptions['allowRequest']>;

export function createSocketOriginAllowRequest(
  originPolicy: ServerOptions['cors'] | false | undefined,
): SocketAllowRequest {
  return (request, callback) => {
    if (isSocketOriginAllowed(request, originPolicy)) {
      callback(undefined, true);
      return;
    }

    callback('WebSocket origin is not allowed', false);
  };
}

function isSocketOriginAllowed(
  request: IncomingMessage,
  originPolicy: ServerOptions['cors'] | false | undefined,
): boolean {
  const requestOrigin = request.headers.origin;

  if (!requestOrigin) {
    return true;
  }

  if (originPolicy === false || originPolicy === undefined) {
    return hasSameOriginHost(requestOrigin, request.headers.host);
  }

  if (typeof originPolicy === 'function') {
    return false;
  }

  return matchesConfiguredOrigin(requestOrigin, originPolicy.origin);
}

function matchesConfiguredOrigin(
  requestOrigin: string,
  configuredOrigin: unknown,
): boolean {
  if (typeof configuredOrigin === 'string') {
    return configuredOrigin === '*' || configuredOrigin === requestOrigin;
  }

  if (configuredOrigin instanceof RegExp) {
    configuredOrigin.lastIndex = 0;
    const isMatch = configuredOrigin.test(requestOrigin);
    configuredOrigin.lastIndex = 0;

    return isMatch;
  }

  if (Array.isArray(configuredOrigin)) {
    return configuredOrigin.some((origin) =>
      matchesConfiguredOrigin(requestOrigin, origin),
    );
  }

  // Custom CORS callbacks cannot safely be mirrored; gateways can provide an explicit allowRequest.
  return false;
}

function hasSameOriginHost(
  requestOrigin: string,
  requestHost: string | undefined,
): boolean {
  if (!requestHost) {
    return false;
  }

  try {
    return new URL(requestOrigin).host === requestHost;
  } catch {
    return false;
  }
}
