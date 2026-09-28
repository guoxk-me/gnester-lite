import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPool, type Pool } from 'mysql2/promise';

import {
  BETTER_AUTH_BASE_PATH,
  BETTER_AUTH_CLIENT_IP_HEADER,
  type BetterAuthConfig,
  readBetterAuthConfig,
} from 'config/better-auth.config';
import { loadBetterAuthModules } from './better-auth.loader.cjs';

async function startBetterAuth(database: Pool, config: BetterAuthConfig) {
  const { betterAuth, toNodeHandler } = await loadBetterAuthModules();
  const auth = betterAuth({
    appName: 'gnester-lite',
    baseURL: config.baseURL,
    basePath: BETTER_AUTH_BASE_PATH,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    database,
    emailAndPassword: {
      enabled: true,
    },
    rateLimit: {
      enabled: config.isRateLimitEnabled,
    },
    advanced: {
      useSecureCookies: config.useSecureCookies,
      ipAddress: {
        ipAddressHeaders: [BETTER_AUTH_CLIENT_IP_HEADER],
      },
    },
  });

  return {
    auth,
    requestHandler: toNodeHandler(auth),
  };
}

type BetterAuthRuntime = Awaited<ReturnType<typeof startBetterAuth>>;
export type BetterAuthInstance = BetterAuthRuntime['auth'];
export type BetterAuthRequestHandler = BetterAuthRuntime['requestHandler'];

@Injectable()
export class BetterAuthService implements OnApplicationShutdown {
  private readonly database: Pool;
  private readonly runtime: Promise<BetterAuthRuntime>;

  constructor(configService: ConfigService) {
    const authConfig = readBetterAuthConfig(configService);

    // AI modified: Better Auth owns a supported mysql2 pool instead of relying on TypeORM driver internals.
    this.database = createPool({
      host: configService.get<string>('DB_HOST', 'localhost'),
      port: configService.get<number>('DB_PORT', 3306),
      user: configService.get<string>('DB_USERNAME', 'root'),
      password: configService.get<string>('DB_PASSWORD', ''),
      database: configService.get<string>('DB_DATABASE', 'test'),
      timezone: 'Z',
    });
    this.runtime = startBetterAuth(this.database, authConfig);
  }

  async getInstance(): Promise<BetterAuthInstance> {
    return (await this.runtime).auth;
  }

  async getRequestHandler(): Promise<BetterAuthRequestHandler> {
    return (await this.runtime).requestHandler;
  }

  async onApplicationShutdown(): Promise<void> {
    // AI modified: close the auth-owned pool within the same graceful shutdown lifecycle as Nest.
    await this.database.end();
  }
}
