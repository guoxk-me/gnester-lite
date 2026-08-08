import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import type { NestMiddleware } from '@nestjs/common';
import helmet from 'helmet';
import { Environment } from 'config/config.types';
import { createHelmetOptions } from './helmet-options';

describe('createHelmetOptions', () => {
  it('keeps development localhost usable while applying default CSP directives', () => {
    const options = createHelmetOptions(Environment.Development);

    expect(options.contentSecurityPolicy).toEqual({
      directives: {
        upgradeInsecureRequests: null,
      },
    });
    expect(options.strictTransportSecurity).toBe(false);
    expect(options.crossOriginEmbedderPolicy).toBe(false);
  });

  it('enables production HTTPS hardening with HSTS and CSP upgrades', () => {
    const options = createHelmetOptions(Environment.Production);

    expect(options.contentSecurityPolicy).toEqual({
      directives: {
        upgradeInsecureRequests: [],
      },
    });
    expect(options.strictTransportSecurity).toEqual({
      includeSubDomains: true,
      maxAge: 31_536_000,
    });
    expect(options.crossOriginEmbedderPolicy).toBe(false);
  });

  // AI modified: preserve integration coverage after removing the one-line middleware wrapper.
  it('applies development security headers through Helmet', async () => {
    const middleware: NestMiddleware['use'] = helmet(
      createHelmetOptions(Environment.Development),
    );
    const req = new IncomingMessage(new Socket());
    const res = new ServerResponse(req);

    await new Promise<void>((resolve, reject) => {
      middleware(req, res, (error?: Error) => {
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

    expect(res.getHeader('x-content-type-options')).toBe('nosniff');
    expect(res.getHeader('x-frame-options')).toBe('SAMEORIGIN');
    expect(res.getHeader('x-powered-by')).toBeUndefined();
    expect(res.getHeader('strict-transport-security')).toBeUndefined();
    expect(contentSecurityPolicy).toContain("default-src 'self'");
    expect(contentSecurityPolicy).not.toContain('upgrade-insecure-requests');
  });
});
