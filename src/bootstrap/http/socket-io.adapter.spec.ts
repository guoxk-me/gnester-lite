import { INestApplicationContext } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { SocketIoAdapter } from './socket-io.adapter';

describe('SocketIoAdapter', () => {
  it('adds project websocket defaults while preserving gateway options', () => {
    const adapter = new SocketIoAdapter({} as INestApplicationContext);

    expect(
      adapter.resolveServerOptions({
        namespace: 'demo-websocket',
        cors: {
          origin: ['https://app.example.com'],
          credentials: false,
        },
      }),
    ).toMatchObject({
      namespace: 'demo-websocket',
      cors: {
        origin: ['https://app.example.com'],
        credentials: false,
      },
      serveClient: false,
      transports: ['websocket'],
    });
  });

  it('uses local development origins when a gateway does not provide cors options', () => {
    const adapter = new SocketIoAdapter({} as INestApplicationContext, {
      origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
      ],
      credentials: true,
    });

    expect(adapter.resolveServerOptions()).toMatchObject({
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

  it('uses the configured HTTP policy and omits CORS when disabled', () => {
    const configuredAdapter = new SocketIoAdapter(
      {} as INestApplicationContext,
      {
        origin: ['https://app.example.com'],
        credentials: false,
      },
    );
    const disabledAdapter = new SocketIoAdapter(
      {} as INestApplicationContext,
      false,
    );

    expect(configuredAdapter.resolveServerOptions()).toMatchObject({
      cors: {
        origin: ['https://app.example.com'],
        credentials: false,
      },
    });
    expect(disabledAdapter.resolveServerOptions()).not.toHaveProperty('cors');
  });

  it('enforces configured origins for websocket-only handshakes', async () => {
    const adapter = new SocketIoAdapter({} as INestApplicationContext, {
      origin: ['https://trusted.example'],
    });
    const allowRequest = adapter.resolveServerOptions().allowRequest;

    await expect(
      runAllowRequest(allowRequest, {
        origin: 'https://trusted.example',
        host: 'api.example',
      }),
    ).resolves.toBe(true);
    await expect(
      runAllowRequest(allowRequest, {
        origin: 'https://hostile.example',
        host: 'api.example',
      }),
    ).resolves.toBe(false);
  });

  it('uses same-host semantics when CORS is disabled and allows clients without Origin', async () => {
    const adapter = new SocketIoAdapter({} as INestApplicationContext, false);
    const allowRequest = adapter.resolveServerOptions().allowRequest;

    await expect(
      runAllowRequest(allowRequest, {
        origin: 'https://api.example',
        host: 'api.example',
      }),
    ).resolves.toBe(true);
    await expect(
      runAllowRequest(allowRequest, {
        origin: 'https://hostile.example',
        host: 'api.example',
      }),
    ).resolves.toBe(false);
    await expect(
      runAllowRequest(allowRequest, {
        host: 'api.example',
      }),
    ).resolves.toBe(true);
  });

  it('allows wildcard policy and preserves explicit gateway allowRequest', async () => {
    const gatewayAllowRequest = jest.fn(
      (
        _request: IncomingMessage,
        callback: (error: string | null | undefined, success: boolean) => void,
      ) => callback(undefined, true),
    );
    const adapter = new SocketIoAdapter({} as INestApplicationContext, {
      origin: '*',
    });
    const wildcardAllowRequest = adapter.resolveServerOptions().allowRequest;
    const resolvedGatewayAllowRequest = adapter.resolveServerOptions({
      allowRequest: gatewayAllowRequest,
    }).allowRequest;

    await expect(
      runAllowRequest(wildcardAllowRequest, {
        origin: 'https://any.example',
        host: 'api.example',
      }),
    ).resolves.toBe(true);
    expect(resolvedGatewayAllowRequest).toBe(gatewayAllowRequest);
  });

  it('resets stateful gateway origin regular expressions between handshakes', async () => {
    const adapter = new SocketIoAdapter({} as INestApplicationContext, {
      origin: /^https:\/\/trusted\.example$/g,
    });
    const allowRequest = adapter.resolveServerOptions().allowRequest;
    const headers = {
      origin: 'https://trusted.example',
      host: 'api.example',
    };

    await expect(runAllowRequest(allowRequest, headers)).resolves.toBe(true);
    await expect(runAllowRequest(allowRequest, headers)).resolves.toBe(true);
  });
});

function runAllowRequest(
  allowRequest: ReturnType<
    SocketIoAdapter['resolveServerOptions']
  >['allowRequest'],
  headers: IncomingMessage['headers'],
): Promise<boolean> {
  if (!allowRequest) {
    throw new Error('allowRequest is required.');
  }

  return new Promise((resolve) => {
    allowRequest({ headers } as IncomingMessage, (_error, success) => {
      resolve(success);
    });
  });
}
