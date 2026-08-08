import type { ExecutionContext } from '@nestjs/common';

import { getCookies } from './cookies.decorator';

describe('Cookies decorator', () => {
  function createContext(cookies?: Record<string, unknown>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          cookies,
        }),
      }),
    } as ExecutionContext;
  }

  it('extracts all parsed request cookies', () => {
    const cookies = { theme: 'dark' };

    expect(getCookies(undefined, createContext(cookies))).toBe(cookies);
  });

  it('extracts a single parsed request cookie by name', () => {
    expect(getCookies('theme', createContext({ theme: 'dark' }))).toBe('dark');
  });

  it('returns undefined for a missing named cookie', () => {
    expect(getCookies('theme', createContext())).toBeUndefined();
  });
});
