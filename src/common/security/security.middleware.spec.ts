// CN: 测试文件，验证 security common 的行为契约；EN: Test file verifies behavior contracts for security common.
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import type { NestMiddleware } from '@nestjs/common';
import { Environment } from 'config/config.types';
import { applySecurityMiddleware } from './security.middleware';

// CN: 测试分组：applySecurityMiddleware；EN: Test group: applySecurityMiddleware.
describe('applySecurityMiddleware', () => {
  // CN: 测试用例：registers Helmet as the first bootstrap middleware and applies development headers；EN: Test case: registers Helmet as the first bootstrap middleware and applies development headers.
  it('registers Helmet as the first bootstrap middleware and applies development headers', async () => {
    const middlewares: NestMiddleware['use'][] = [];

    applySecurityMiddleware(
      {
        use: (middleware: NestMiddleware['use']) => {
          middlewares.push(middleware);
        },
      },
      Environment.Development,
    );

    const req = new IncomingMessage(new Socket());
    const res = new ServerResponse(req);
    await new Promise<void>((resolve, reject) => {
      middlewares[0](req, res, (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
    const contentSecurityPolicy = String(
      res.getHeader('content-security-policy'),
    );

    expect(middlewares).toHaveLength(1);
    expect(res.getHeader('x-content-type-options')).toBe('nosniff');
    expect(res.getHeader('x-frame-options')).toBe('SAMEORIGIN');
    expect(res.getHeader('x-powered-by')).toBeUndefined();
    expect(res.getHeader('strict-transport-security')).toBeUndefined();
    expect(contentSecurityPolicy).toContain("default-src 'self'");
    expect(contentSecurityPolicy).not.toContain('upgrade-insecure-requests');
  });
});
