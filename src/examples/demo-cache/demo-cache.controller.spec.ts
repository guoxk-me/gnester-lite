import type { Server } from 'node:http';
import { CACHE_TTL_METADATA, CacheModule } from '@nestjs/cache-manager';
import { INestApplication } from '@nestjs/common';
import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import request from 'supertest';

import { CacheService } from '../../platform/infrastructure/cache/cache.service';
import { HttpCacheInterceptor } from '../../platform/infrastructure/cache/http-cache.interceptor';
import { DemoCacheController } from './demo-cache.controller';
import { DemoCacheService } from './demo-cache.service';
import {
  DemoCacheKeyParamsDto,
  DemoCacheVariantParamsDto,
} from './dto/demo-cache-params.dto';

describe('DemoCacheController', () => {
  const cachedResponses = new Map<string, unknown>();
  const responseCacheService: jest.Mocked<Pick<CacheService, 'get' | 'set'>> = {
    get: jest.fn(),
    set: jest.fn(),
  };
  const service: jest.Mocked<
    Pick<
      DemoCacheService,
      'create' | 'findAll' | 'findOne' | 'getHttpResponse' | 'update' | 'remove'
    >
  > = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    getHttpResponse: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  let controller: DemoCacheController;

  beforeEach(async () => {
    jest.clearAllMocks();
    cachedResponses.clear();
    responseCacheService.get.mockImplementation((key) =>
      Promise.resolve(cachedResponses.get(key)),
    );
    responseCacheService.set.mockImplementation((key, response) => {
      cachedResponses.set(key, response);

      return Promise.resolve();
    });

    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.register()],
      controllers: [DemoCacheController],
      providers: [
        {
          provide: CacheService,
          useValue: responseCacheService,
        },
        HttpCacheInterceptor,
        {
          provide: DemoCacheService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DemoCacheController>(DemoCacheController);
  });

  it('delegates cache item creation to the service', async () => {
    const cacheItem = { key: 'welcome', value: 'hello cache' };
    service.create.mockResolvedValueOnce(cacheItem);

    await expect(controller.create(cacheItem)).resolves.toEqual(cacheItem);
    expect(service.create).toHaveBeenCalledWith(cacheItem);
  });

  it('delegates cache item listing to the service', async () => {
    service.findAll.mockResolvedValueOnce([]);

    await expect(controller.findAll()).resolves.toEqual([]);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('delegates single cache item reads to the service', async () => {
    const cacheItem = { key: 'welcome', value: 'hello cache' };
    service.findOne.mockResolvedValueOnce(cacheItem);

    await expect(controller.findOne({ key: 'welcome' })).resolves.toEqual(
      cacheItem,
    );
    expect(service.findOne).toHaveBeenCalledWith('welcome');
  });

  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
    ['invalid-character', 'bad/key'],
    ['overlong', 'x'.repeat(65)],
  ])('rejects an %s cache key path', async (_scenario, key) => {
    const params = plainToInstance(DemoCacheKeyParamsDto, { key });

    await expect(validate(params)).resolves.not.toHaveLength(0);
  });

  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
    ['invalid-character', 'bad/variant'],
    ['overlong', 'x'.repeat(65)],
  ])('rejects an %s cache variant path', async (_scenario, variant) => {
    const params = plainToInstance(DemoCacheVariantParamsDto, { variant });

    await expect(validate(params)).resolves.not.toHaveLength(0);
  });

  it('mounts the shared HTTP cache interceptor with a bounded TTL', () => {
    const handler = Object.getOwnPropertyDescriptor(
      DemoCacheController.prototype,
      'getHttpResponse',
    )?.value as (...arguments_: unknown[]) => unknown;
    const interceptors = Reflect.getMetadata(
      INTERCEPTORS_METADATA,
      handler,
    ) as unknown[];

    expect(Reflect.getMetadata(CACHE_TTL_METADATA, handler)).toBe(5_000);
    expect(interceptors).toContain(HttpCacheInterceptor);
  });

  it('serves cache hits and varies by authorization at HTTP level', async () => {
    const httpService = {
      ...service,
      getHttpResponse: jest
        .fn()
        .mockReturnValueOnce({
          variant: 'stable',
          generatedAt: '2026-07-28T00:00:00.000Z',
          cacheTtlMilliseconds: 5_000,
        })
        .mockReturnValueOnce({
          variant: 'stable',
          generatedAt: '2026-07-28T00:00:01.000Z',
          cacheTtlMilliseconds: 5_000,
        }),
    };
    const module = await Test.createTestingModule({
      imports: [CacheModule.register()],
      controllers: [DemoCacheController],
      providers: [
        {
          provide: CacheService,
          useValue: responseCacheService,
        },
        HttpCacheInterceptor,
        {
          provide: DemoCacheService,
          useValue: httpService,
        },
      ],
    }).compile();
    const app: INestApplication = module.createNestApplication();
    const httpServer = app.getHttpServer() as Server;

    await app.init();

    try {
      const firstResponse = await request(httpServer)
        .get('/demo-cache/http-response/stable')
        .set('Authorization', 'Bearer user-a')
        .expect(200);
      const cachedResponse = await request(httpServer)
        .get('/demo-cache/http-response/stable')
        .set('Authorization', 'Bearer user-a')
        .expect(200);
      const variedResponse = await request(httpServer)
        .get('/demo-cache/http-response/stable')
        .set('Authorization', 'Bearer user-b')
        .expect(200);

      expect(cachedResponse.body).toEqual(firstResponse.body);
      expect(variedResponse.body).not.toEqual(firstResponse.body);
      expect(httpService.getHttpResponse).toHaveBeenCalledTimes(2);
    } finally {
      await app.close();
    }
  });

  it('delegates cache item updates to the service', async () => {
    const cacheItem = { key: 'welcome', value: 'updated cache' };
    service.update.mockResolvedValueOnce(cacheItem);

    await expect(
      controller.update({ key: 'welcome' }, { value: 'updated cache' }),
    ).resolves.toEqual(cacheItem);
    expect(service.update).toHaveBeenCalledWith('welcome', {
      value: 'updated cache',
    });
  });

  it('delegates cache item deletion to the service', async () => {
    service.remove.mockResolvedValueOnce(undefined);

    await expect(
      controller.remove({ key: 'welcome' }),
    ).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith('welcome');
  });
});
