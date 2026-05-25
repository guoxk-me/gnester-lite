import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HttpCacheInterceptor } from './http-cache.interceptor';

class TestHttpCacheInterceptor extends HttpCacheInterceptor {
  testTrackBy(context: ExecutionContext): string | undefined {
    return this.trackBy(context);
  }
}

describe('HttpCacheInterceptor', () => {
  let interceptor: TestHttpCacheInterceptor;

  beforeEach(() => {
    interceptor = new TestHttpCacheInterceptor({}, new Reflector());
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
});

function createHttpContext(
  method: string,
  url: string,
  headers: Record<string, string> = {},
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        url,
        originalUrl: url,
        headers,
      }),
    }),
  } as ExecutionContext;
}
