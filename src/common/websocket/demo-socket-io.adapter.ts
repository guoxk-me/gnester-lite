// CN: 适配器，连接框架和 websocket common 实现；EN: Adapter connects the framework with websocket common implementation.
import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';

export type DemoSocketIoServerOptions = Partial<ServerOptions> & {
  readonly namespace?: string;
  readonly server?: unknown;
};

const DEFAULT_WEBSOCKET_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

export class DemoSocketIoAdapter extends IoAdapter {
  // CN: 初始化 websocket common 的依赖和运行状态；EN: Initializes dependencies and runtime state for websocket common.
  constructor(app: INestApplicationContext) {
    super(app);
  }

  // CN: 执行 websocket common 的 create ioserver 逻辑；EN: Runs the create ioserver logic for websocket common.
  createIOServer(port: number, options?: DemoSocketIoServerOptions): unknown {
    return super.createIOServer(port, this.resolveServerOptions(options));
  }

  // CN: 执行 websocket common 的 resolve server options 逻辑；EN: Runs the resolve server options logic for websocket common.
  resolveServerOptions(
    options: DemoSocketIoServerOptions = {},
  ): DemoSocketIoServerOptions {
    return {
      ...options,
      cors: options.cors ?? {
        origin: DEFAULT_WEBSOCKET_ORIGINS,
        credentials: true,
      },
      serveClient: options.serveClient ?? false,
      transports: options.transports ?? ['websocket'],
    };
  }
}
