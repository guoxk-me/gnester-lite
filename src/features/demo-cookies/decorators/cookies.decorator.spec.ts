// CN: 测试文件，验证 demo-cookies 的行为契约；EN: Test file verifies behavior contracts for demo-cookies.
import type { ExecutionContext } from '@nestjs/common';

import { getCookies } from './cookies.decorator';

// CN: 测试分组：Cookies decorator；EN: Test group: Cookies decorator.
describe('Cookies decorator', () => {
  // CN: 准备或验证 demo-cookies 的 create context 测试逻辑；EN: Prepares or verifies the create context test logic for demo-cookies.
  function createContext(cookies?: Record<string, unknown>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          cookies,
        }),
      }),
    } as ExecutionContext;
  }

  // CN: 测试用例：extracts all parsed request cookies；EN: Test case: extracts all parsed request cookies.
  it('extracts all parsed request cookies', () => {
    const cookies = { theme: 'dark' };

    expect(getCookies(undefined, createContext(cookies))).toBe(cookies);
  });

  // CN: 测试用例：extracts a single parsed request cookie by name；EN: Test case: extracts a single parsed request cookie by name.
  it('extracts a single parsed request cookie by name', () => {
    expect(getCookies('theme', createContext({ theme: 'dark' }))).toBe('dark');
  });

  // CN: 测试用例：returns undefined for a missing named cookie；EN: Test case: returns undefined for a missing named cookie.
  it('returns undefined for a missing named cookie', () => {
    expect(getCookies('theme', createContext())).toBeUndefined();
  });
});
