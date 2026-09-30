import type { ServerOptions } from 'socket.io';

export type SocketIoServerOptions = Partial<ServerOptions> & {
  readonly namespace?: string;
  readonly server?: unknown;
};

export type SocketAllowRequest = NonNullable<ServerOptions['allowRequest']>;
