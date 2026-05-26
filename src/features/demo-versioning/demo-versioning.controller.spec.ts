import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DemoVersioningController } from './demo-versioning.controller';
import { DemoVersioningService } from './demo-versioning.service';

describe('DemoVersioningController', () => {
  const service: jest.Mocked<
    Pick<
      DemoVersioningService,
      'findV1' | 'findV2' | 'findShared' | 'findNeutral'
    >
  > = {
    findV1: jest.fn(),
    findV2: jest.fn(),
    findShared: jest.fn(),
    findNeutral: jest.fn(),
  };
  let controller: DemoVersioningController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoVersioningController],
      providers: [
        {
          provide: DemoVersioningService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DemoVersioningController>(DemoVersioningController);
  });

  it('delegates version 1 responses to the service', () => {
    service.findV1.mockReturnValueOnce({
      version: '1',
      message: 'demo versioning response for v1',
    });

    expect(controller.getV1()).toEqual({
      version: '1',
      message: 'demo versioning response for v1',
    });
    expect(service.findV1).toHaveBeenCalled();
  });

  it('delegates version 2 responses to the service', () => {
    service.findV2.mockReturnValueOnce({
      version: '2',
      message: 'demo versioning response for v2',
      changes: ['adds a changes field'],
    });

    expect(controller.getV2()).toEqual({
      version: '2',
      message: 'demo versioning response for v2',
      changes: ['adds a changes field'],
    });
    expect(service.findV2).toHaveBeenCalled();
  });

  it('delegates shared responses to the service', () => {
    service.findShared.mockReturnValueOnce({
      versions: ['1', '2'],
      message: 'shared response for v1 and v2',
    });

    expect(controller.getShared()).toEqual({
      versions: ['1', '2'],
      message: 'shared response for v1 and v2',
    });
    expect(service.findShared).toHaveBeenCalled();
  });

  it('delegates version-neutral responses to the service', () => {
    service.findNeutral.mockReturnValueOnce({
      version: 'neutral',
      message: 'available without an API version prefix',
    });

    expect(controller.getNeutral()).toEqual({
      version: 'neutral',
      message: 'available without an API version prefix',
    });
    expect(service.findNeutral).toHaveBeenCalled();
  });
});

describe('DemoVersioningController routes', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoVersioningController],
      providers: [DemoVersioningService],
    }).compile();

    app = module.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
      prefix: 'v',
      defaultVersion: '1',
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('routes requests to the matching URI version', async () => {
    await request(app.getHttpServer()).get('/v1/demo-versioning').expect(200, {
      version: '1',
      message: 'demo versioning response for v1',
    });

    await request(app.getHttpServer())
      .get('/v2/demo-versioning')
      .expect(200, {
        version: '2',
        message: 'demo versioning response for v2',
        changes: ['adds a changes field'],
      });
  });

  it('routes shared and neutral version examples', async () => {
    await request(app.getHttpServer())
      .get('/v1/demo-versioning/shared')
      .expect(200, {
        versions: ['1', '2'],
        message: 'shared response for v1 and v2',
      });

    await request(app.getHttpServer())
      .get('/v2/demo-versioning/shared')
      .expect(200, {
        versions: ['1', '2'],
        message: 'shared response for v1 and v2',
      });

    await request(app.getHttpServer())
      .get('/demo-versioning/neutral')
      .expect(200, {
        version: 'neutral',
        message: 'available without an API version prefix',
      });
  });

  it('returns 404 for unsupported versions', async () => {
    await request(app.getHttpServer()).get('/v3/demo-versioning').expect(404);
  });
});
