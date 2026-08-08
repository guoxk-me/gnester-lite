import { ConfigService } from '@nestjs/config';

import {
  BETTER_AUTH_BASE_PATH,
  BETTER_AUTH_LOCAL_DEVELOPMENT_SECRET,
} from 'config/better-auth.config';
import { BetterAuthService } from './better-auth.service';

describe('BetterAuthService', () => {
  it('configures the MySQL-backed email and password API', async () => {
    const service = new BetterAuthService(
      new ConfigService({
        NODE_ENV: 'test',
        PORT: 3000,
        DB_HOST: '127.0.0.1',
        DB_PORT: 3306,
        DB_USERNAME: 'test-user',
        DB_PASSWORD: 'test-password',
        DB_DATABASE: 'test-database',
      }),
    );

    try {
      const auth = await service.getInstance();

      expect(auth.options).toMatchObject({
        appName: 'gnester-lite',
        baseURL: 'http://localhost:3000',
        basePath: BETTER_AUTH_BASE_PATH,
        secret: BETTER_AUTH_LOCAL_DEVELOPMENT_SECRET,
        emailAndPassword: {
          enabled: true,
        },
        rateLimit: {
          enabled: true,
        },
        advanced: {
          useSecureCookies: false,
          ipAddress: {
            ipAddressHeaders: ['x-gnester-client-ip'],
          },
        },
      });
      expect(auth.options.trustedOrigins).toContain('http://localhost:5173');
      await expect(service.getRequestHandler()).resolves.toEqual(
        expect.any(Function),
      );
    } finally {
      await service.onApplicationShutdown();
    }
  });
});
