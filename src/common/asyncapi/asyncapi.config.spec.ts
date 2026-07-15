// CN: 测试文件，验证 AsyncAPI 文档端点配置。
// EN: Test file verifies AsyncAPI documentation endpoint configuration.
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ApiProperty } from '@nestjs/swagger';
import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import type { Express } from 'express';
import { AsyncApiModule, AsyncApiReceive } from 'nestjs-asyncapi';
import request from 'supertest';

import { Environment } from 'config/config.types';
import { setupAsyncApi } from './asyncapi.config';

class AsyncApiTestMessageDto {
  @ApiProperty({ example: 'hello' })
  readonly message: string;
}

interface AsyncApiResponseBody {
  readonly asyncapi: string;
  readonly channels: Record<string, { readonly address?: string }>;
}

@WebSocketGateway()
class AsyncApiTestGateway {
  @SubscribeMessage('asyncapi.test')
  @AsyncApiReceive({
    channel: 'asyncapi.test',
    message: {
      name: 'AsyncApiTestMessage',
      payload: AsyncApiTestMessageDto,
    },
  })
  handleMessage(): void {}
}

describe('setupAsyncApi', () => {
  const get = jest.fn();
  const expressApplication = { get } as unknown as Express;
  const app = {
    getHttpAdapter: () => ({
      getInstance: () => expressApplication,
    }),
  } as unknown as NestExpressApplication;

  afterEach(() => {
    jest.restoreAllMocks();
    get.mockReset();
  });

  it('registers importable AsyncAPI endpoints outside production', () => {
    const asyncApiDocument = {
      asyncapi: '3.0.0',
      channels: {},
      operations: {},
    };
    const createDocument = jest
      .spyOn(AsyncApiModule, 'createDocument')
      .mockReturnValue(asyncApiDocument as never);
    const setup = jest
      .spyOn(AsyncApiModule, 'setup')
      .mockResolvedValue(undefined);

    setupAsyncApi(app, Environment.Development, 4310);

    const asyncApiOptions = createDocument.mock.calls[0]?.[1];

    expect(createDocument).toHaveBeenCalledWith(app, asyncApiOptions);
    expect(asyncApiOptions?.asyncapi).toBe('3.0.0');
    expect(asyncApiOptions?.servers).toEqual({
      local: {
        host: 'localhost:4310',
        pathname: '/demo-websocket',
        protocol: 'socket.io',
        security: [{ $ref: '#/components/securitySchemes/bearer' }],
      },
    });
    expect(get).toHaveBeenCalledWith('/async-api', expect.any(Function));
    expect(get).toHaveBeenCalledWith('/async-api-json', expect.any(Function));
    expect(get).toHaveBeenCalledWith('/async-api-yaml', expect.any(Function));
    expect(setup).not.toHaveBeenCalled();
  });

  it('does not expose AsyncAPI documentation in production', () => {
    const createDocument = jest.spyOn(AsyncApiModule, 'createDocument');

    setupAsyncApi(app, Environment.Production, 4310);

    expect(createDocument).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });

  it('serves generated documents without running the HTML generator', async () => {
    const moduleFixture = await Test.createTestingModule({
      providers: [AsyncApiTestGateway],
    }).compile();
    const testApp =
      moduleFixture.createNestApplication<NestExpressApplication>();

    setupAsyncApi(testApp, Environment.Development, 4310);
    await testApp.init();

    try {
      await request(testApp.getHttpServer())
        .get('/async-api')
        .expect('Content-Type', /html/)
        .expect(200);
      const jsonResponse = await request(testApp.getHttpServer())
        .get('/async-api-json')
        .expect('Content-Type', /json/)
        .expect(200);
      await request(testApp.getHttpServer())
        .get('/async-api-yaml')
        .expect('Content-Type', /yaml/)
        .expect(200)
        .expect(/asyncapi: 3\.0\.0/);
      const responseBody = jsonResponse.body as AsyncApiResponseBody;

      expect(responseBody.asyncapi).toBe('3.0.0');
      expect(responseBody.channels.asyncapiTest?.address).toBe('asyncapi.test');
    } finally {
      await testApp.close();
    }
  });
});
