import {
  ServiceUnavailableException,
  type CallHandler,
  type ExecutionContext,
} from '@nestjs/common';
import { CACHE_TTL_METADATA } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { CacheService } from './cache.service';
import { HttpCacheInterceptor } from './http-cache.interceptor';

class TestHttpCacheInterceptor extends HttpCacheInterceptor {
  testTrackBy(context: ExecutionContext): string | undefined {
    return this.trackBy(context);
  }
}

describe('HttpCacheInterceptor', () => {
  const cacheService: jest.Mocked<Pick<CacheService, 'get' | 'set'>> = {
    get: jest.fn(),
    set: jest.fn(),
  };
  let interceptor: TestHttpCacheInterceptor;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService.get.mockResolvedValue(undefined);
    cacheService.set.mockResolvedValue(undefined);
    interceptor = new TestHttpCacheInterceptor(
      cacheService as unknown as CacheService,
      new Reflector(),
    );
  });

  it('uses method and request url for anonymous GET requests', () => {
    const key = interceptor.testTrackBy(
      createHttpContext('GET', '/demo?take=10'),
    );

    expect(key).toBe('http:GET:/demo?take=10');
  });

  it('does not cache non-GET requests', () => {
    const key = interceptor.testTrackBy(createHttpContext('POST', '/demo'));

    expect(key).toBeUndefined();
  });

  it('varies cache keys by identity headers without storing raw secrets', () => {
    const key = interceptor.testTrackBy(
      createHttpContext('GET', '/profile', {
        authorization: 'Bearer secret-token',
        'x-tenant-id': 'tenant-a',
      }),
    );

    expect(key).toMatch(/^http:GET:\/profile:vary:[a-f0-9]{64}$/);
    expect(key).not.toContain('secret-token');
    expect(key).not.toContain('tenant-a');
  });

  it('varies localized response cache entries by Accept-Language', () => {
    const englishKey = interceptor.testTrackBy(
      createHttpContext('GET', '/profile', { 'accept-language': 'en' }),
    );
    const chineseKey = interceptor.testTrackBy(
      createHttpContext('GET', '/profile', { 'accept-language': 'zh' }),
    );

    expect(englishKey).toMatch(/^http:GET:\/profile:vary:[a-f0-9]{64}$/);
    expect(chineseKey).toMatch(/^http:GET:\/profile:vary:[a-f0-9]{64}$/);
    expect(englishKey).not.toBe(chineseKey);
  });

  it('returns a cached response without invoking the route handler', async () => {
    cacheService.get.mockResolvedValueOnce({ generatedAt: 'cached' });
    const { handleRoute, next } = createNextHandler({
      generatedAt: 'fresh',
    });

    const responseStream = await interceptor.intercept(
      createHttpContext('GET', '/report'),
      next,
    );

    await expect(firstValueFrom(responseStream)).resolves.toEqual({
      generatedAt: 'cached',
    });
    expect(handleRoute).not.toHaveBeenCalled();
  });

  it('fails open after a bounded cache backend failure', async () => {
    cacheService.get.mockRejectedValueOnce(
      new ServiceUnavailableException('Redis stalled'),
    );
    const { handleRoute, next } = createNextHandler({
      generatedAt: 'fresh',
    });

    const responseStream = await interceptor.intercept(
      createHttpContext('GET', '/report'),
      next,
    );

    await expect(firstValueFrom(responseStream)).resolves.toEqual({
      generatedAt: 'fresh',
    });
    expect(handleRoute).toHaveBeenCalledTimes(1);
  });

  it('stores cache misses with the route TTL without delaying the response', async () => {
    const handler = (): void => undefined;
    Reflect.defineMetadata(CACHE_TTL_METADATA, 5_000, handler);
    const { next } = createNextHandler({ generatedAt: 'fresh' });

    const responseStream = await interceptor.intercept(
      createHttpContext('GET', '/report', {}, handler),
      next,
    );

    await expect(firstValueFrom(responseStream)).resolves.toEqual({
      generatedAt: 'fresh',
    });
    expect(cacheService.set).toHaveBeenCalledWith(
      'http:GET:/report',
      { generatedAt: 'fresh' },
      5_000,
    );
  });
});

function createHttpContext(
  method: string,
  url: string,
  headers: Record<string, string> = {},
  handler: () => void = () => undefined,
): ExecutionContext {
  return {
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        url,
        originalUrl: url,
        headers,
      }),
    }),
  } as unknown as ExecutionContext;
}

function createNextHandler(response: unknown): {
  readonly handleRoute: jest.MockedFunction<CallHandler<unknown>['handle']>;
  readonly next: CallHandler<unknown>;
} {
  const handleRoute = jest.fn(() => of(response));

  return {
    handleRoute,
    next: {
      handle: handleRoute,
    },
  };
}
