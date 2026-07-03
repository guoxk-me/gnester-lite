// CN: 测试文件，验证 cache common 的行为契约；EN: Test file verifies behavior contracts for cache common.
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HttpCacheInterceptor } from './http-cache.interceptor';

class TestHttpCacheInterceptor extends HttpCacheInterceptor {
  // CN: 准备或验证 cache common 的 test track by 测试逻辑；EN: Prepares or verifies the test track by test logic for cache common.
  testTrackBy(context: ExecutionContext): string | undefined {
    return this.trackBy(context);
  }
}

// CN: 测试分组：HttpCacheInterceptor；EN: Test group: HttpCacheInterceptor.
describe('HttpCacheInterceptor', () => {
  let interceptor: TestHttpCacheInterceptor;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    interceptor = new TestHttpCacheInterceptor({}, new Reflector());
  });

  // CN: 测试用例：uses method and request url for anonymous GET requests；EN: Test case: uses method and request url for anonymous GET requests.
  it('uses method and request url for anonymous GET requests', () => {
    const key = interceptor.testTrackBy(
      createHttpContext('GET', '/demo?take=10'),
    );

    expect(key).toBe('http:GET:/demo?take=10');
  });

  // CN: 测试用例：does not cache non-GET requests；EN: Test case: does not cache non-GET requests.
  it('does not cache non-GET requests', () => {
    const key = interceptor.testTrackBy(createHttpContext('POST', '/demo'));

    expect(key).toBeUndefined();
  });

  // CN: 测试用例：varies cache keys by identity headers without storing raw secrets；EN: Test case: varies cache keys by identity headers without storing raw secrets.
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

// CN: 准备或验证 cache common 的 create http context 测试逻辑；EN: Prepares or verifies the create http context test logic for cache common.
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
