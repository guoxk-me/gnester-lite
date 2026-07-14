// CN: 测试文件，验证 websocket common 的行为契约；EN: Test file verifies behavior contracts for websocket common.
import { INestApplicationContext } from '@nestjs/common';
import { DemoSocketIoAdapter } from './demo-socket-io.adapter';

// CN: 测试分组：DemoSocketIoAdapter；EN: Test group: DemoSocketIoAdapter.
describe('DemoSocketIoAdapter', () => {
  // CN: 测试用例：adds project websocket defaults while preserving gateway options；EN: Test case: adds project websocket defaults while preserving gateway options.
  it('adds project websocket defaults while preserving gateway options', () => {
    const adapter = new DemoSocketIoAdapter({} as INestApplicationContext);

    expect(
      adapter.resolveServerOptions({
        namespace: 'demo-websocket',
        cors: {
          origin: ['https://app.example.com'],
          credentials: false,
        },
      }),
    ).toEqual({
      namespace: 'demo-websocket',
      cors: {
        origin: ['https://app.example.com'],
        credentials: false,
      },
      serveClient: false,
      transports: ['websocket'],
    });
  });

  // CN: 测试用例：uses local development origins when a gateway does not provide cors options；EN: Test case: uses local development origins when a gateway does not provide cors options.
  it('uses local development origins when a gateway does not provide cors options', () => {
    const adapter = new DemoSocketIoAdapter({} as INestApplicationContext);

    expect(adapter.resolveServerOptions()).toEqual({
      cors: {
        origin: [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173',
        ],
        credentials: true,
      },
      serveClient: false,
      transports: ['websocket'],
    });
  });
});
