import { HttpModule, HttpService } from '@nestjs/axios';
import {
  BullModule,
  type BullRootModuleOptions,
  getSharedConfigToken,
} from '@nestjs/bullmq';
import {
  CACHE_MANAGER,
  CacheModule as NestCacheModule,
} from '@nestjs/cache-manager';
import { Inject, Injectable, Module } from '@nestjs/common';
import {
  GLOBAL_MODULE_METADATA,
  MODULE_METADATA,
} from '@nestjs/common/constants';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  ScheduleModule as NestScheduleModule,
  SchedulerRegistry,
} from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import type { Cache } from 'cache-manager';
import { randomBytes } from 'node:crypto';

import { shouldEnableDemos } from 'config/demo-catalog';
import { AppModule } from './app.module';
import { CommonCacheModule } from './platform/infrastructure/cache/cache.module';
import { CacheService } from './platform/infrastructure/cache/cache.service';
import { HttpCacheInterceptor } from './platform/infrastructure/cache/http-cache.interceptor';
import { CommonHealthModule } from './platform/operations/health/health.module';
import { CommonHttpClientModule } from './platform/infrastructure/http-client/http-client.module';
import { CommonQueueModule } from './platform/infrastructure/queue/queue.module';
import { CommonQueueService } from './platform/infrastructure/queue/queue.service';
import { CommonScheduleModule } from './platform/runtime/schedule/schedule.module';
import { CommonScheduleService } from './platform/runtime/schedule/schedule.service';
import { DemoCacheModule } from './examples/demo-cache/demo-cache.module';
import { DemoEventsModule } from './examples/demo-events/demo-events.module';
import { DemoHttpModule } from './examples/demo-http/demo-http.module';
import { DemoQueueModule } from './examples/demo-queue/demo-queue.module';
import { DemoScheduleModule } from './examples/demo-schedule/demo-schedule.module';
import { DemosModule } from './examples/demos.module';

@Injectable()
class ExplicitInfrastructureConsumer {
  constructor(
    readonly cacheService: CacheService,
    readonly httpService: HttpService,
    readonly queueService: CommonQueueService,
    readonly scheduleService: CommonScheduleService,
    @Inject(CACHE_MANAGER) readonly cacheManager: Cache,
    @Inject(getSharedConfigToken())
    readonly bullConfig: BullRootModuleOptions,
    readonly schedulerRegistry: SchedulerRegistry,
  ) {}
}

@Module({
  // AI modified: the consumer module declares every infrastructure provider it injects.
  imports: [
    CommonCacheModule,
    CommonHttpClientModule,
    CommonQueueModule,
    CommonScheduleModule,
  ],
  providers: [ExplicitInfrastructureConsumer],
})
class ExplicitInfrastructureConsumerModule {}

describe('AppModule infrastructure boundaries', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('excludes the educational demo catalog from production', () => {
    expect(shouldEnableDemos('production')).toBe(false);
    expect(shouldEnableDemos('development')).toBe(true);
    expect(shouldEnableDemos('test')).toBe(true);
    expect(shouldEnableDemos('provision')).toBe(true);
    expect(shouldEnableDemos(undefined)).toBe(true);
  });

  it('omits DemosModule from the production Nest module graph', async () => {
    jest.resetModules();
    const productionEnvironment = {
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://app.example.com',
      CSRF_ENABLED: 'false',
      DB_HOST: 'database.internal',
      DB_PORT: '3306',
      DB_USERNAME: 'application',
      DB_PASSWORD: 'runtime-only-password',
      DB_DATABASE: 'application',
      REDIS_URL: 'redis://redis.internal:6379',
      BETTER_AUTH_SECRET: randomBytes(48).toString('base64url'),
      BETTER_AUTH_URL: 'https://api.example.com',
      JWT_SECRET: randomBytes(48).toString('base64url'),
      ENCRYPTION_KEY: randomBytes(32).toString('base64url'),
      HMAC_SECRET: randomBytes(48).toString('base64url'),
    };
    const originalEnvironment = Object.fromEntries(
      Object.keys(productionEnvironment).map((key) => [key, process.env[key]]),
    );

    Object.assign(process.env, productionEnvironment);

    try {
      const modulePath = './app.module';
      const productionExports = (await import(modulePath)) as {
        readonly AppModule: object;
      };
      const productionImports = getModuleImports(productionExports.AppModule);

      expect(
        productionImports.some(
          (importedModule) =>
            typeof importedModule === 'function' &&
            importedModule.name === 'DemosModule',
        ),
      ).toBe(false);
    } finally {
      for (const [key, value] of Object.entries(originalEnvironment)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });

  it('keeps root registration inside explicit capability modules', () => {
    expect(
      getDynamicModuleImport(CommonCacheModule, NestCacheModule),
    ).toBeDefined();
    expect(
      getDynamicModuleImport(CommonHttpClientModule, HttpModule),
    ).toBeDefined();
    expect(getDynamicModuleImport(CommonQueueModule, BullModule)).toBeDefined();
    expect(
      getDynamicModuleImport(CommonScheduleModule, NestScheduleModule),
    ).toBeDefined();
    expect(
      getDynamicModuleImport(DemoEventsModule, EventEmitterModule),
    ).toBeDefined();

    expect(
      Reflect.getMetadata(GLOBAL_MODULE_METADATA, CommonCacheModule),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(GLOBAL_MODULE_METADATA, CommonHttpClientModule),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(GLOBAL_MODULE_METADATA, CommonQueueModule),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(GLOBAL_MODULE_METADATA, CommonScheduleModule),
    ).toBeUndefined();
    expect(getModuleExports(CommonCacheModule)).toEqual([
      NestCacheModule,
      CacheService,
      HttpCacheInterceptor,
    ]);
    expect(getModuleExports(CommonQueueModule)).toEqual([
      BullModule,
      CommonQueueService,
    ]);
    expect(getModuleExports(CommonScheduleModule)).toEqual([
      NestScheduleModule,
      CommonScheduleService,
    ]);

    const appImports = getModuleImports(AppModule);

    expect(hasImportedModule(appImports, NestCacheModule)).toBe(false);
    expect(hasImportedModule(appImports, BullModule)).toBe(false);
    expect(hasImportedModule(appImports, NestScheduleModule)).toBe(false);
    expect(hasImportedModule(appImports, EventEmitterModule)).toBe(false);
    expect(countImportedModule(appImports, CommonCacheModule)).toBe(0);
    expect(countImportedModule(appImports, CommonHttpClientModule)).toBe(0);
    expect(countImportedModule(appImports, CommonQueueModule)).toBe(0);
    expect(countImportedModule(appImports, CommonScheduleModule)).toBe(0);
    expect(countImportedModule(appImports, DemosModule)).toBe(1);
  });

  it('makes every feature and readiness module declare its capability imports', () => {
    expect(
      countImportedModule(
        getModuleImports(CommonHealthModule),
        CommonCacheModule,
      ),
    ).toBe(1);
    expect(
      countImportedModule(getModuleImports(DemoCacheModule), CommonCacheModule),
    ).toBe(1);
    expect(
      countImportedModule(
        getModuleImports(DemoHttpModule),
        CommonHttpClientModule,
      ),
    ).toBe(1);
    expect(
      countImportedModule(getModuleImports(DemoQueueModule), CommonQueueModule),
    ).toBe(1);
    expect(
      countImportedModule(
        getModuleImports(DemoScheduleModule),
        CommonScheduleModule,
      ),
    ).toBe(1);
  });

  it('exposes one provider instance through explicit module imports', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
          load: [
            () => ({
              NODE_ENV: 'test',
              REDIS_URL: 'redis://127.0.0.1:6379',
              app: {
                name: 'gnester-lite',
              },
              cache: {
                ttl: 0,
              },
              http: {
                baseUrl: 'https://example.test',
                timeout: 1_000,
                maxRedirects: 0,
                maxContentLength: 1_024,
                maxBodyLength: 1_024,
              },
              queue: {
                enabled: false,
                prefix: 'test',
                defaultAttempts: 1,
                backoffDelay: 1,
                removeOnComplete: 1,
                removeOnFail: 1,
              },
              schedule: {
                enabled: false,
                timeZone: 'UTC',
              },
            }),
          ],
        }),
        ExplicitInfrastructureConsumerModule,
      ],
    }).compile();

    try {
      const consumer = moduleRef.get(ExplicitInfrastructureConsumer);

      expect(consumer.cacheService).toBe(moduleRef.get(CacheService));
      expect(consumer.httpService).toBe(moduleRef.get(HttpService));
      expect(consumer.queueService).toBe(moduleRef.get(CommonQueueService));
      expect(consumer.scheduleService).toBe(
        moduleRef.get(CommonScheduleService),
      );
      expect(consumer.cacheManager).toBe(moduleRef.get(CACHE_MANAGER));
      expect(consumer.bullConfig).toMatchObject({
        prefix: 'test:test',
        connection: {
          url: 'redis://127.0.0.1:6379',
          lazyConnect: true,
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
        },
      });
      expect(consumer.schedulerRegistry).toBe(moduleRef.get(SchedulerRegistry));
    } finally {
      await moduleRef.close();
    }
  });
});

function getModuleImports(moduleType: object): unknown[] {
  return (Reflect.getMetadata(MODULE_METADATA.IMPORTS, moduleType) ??
    []) as unknown[];
}

function getModuleExports(moduleType: object): unknown[] {
  return (Reflect.getMetadata(MODULE_METADATA.EXPORTS, moduleType) ??
    []) as unknown[];
}

function getDynamicModuleImport(
  moduleType: object,
  expectedModule: unknown,
): { readonly module: unknown } | undefined {
  return getModuleImports(moduleType).find(
    (importedModule): importedModule is { readonly module: unknown } =>
      isDynamicModule(importedModule) &&
      importedModule.module === expectedModule,
  );
}

function hasImportedModule(
  imports: unknown[],
  expectedModule: unknown,
): boolean {
  return imports.some(
    (importedModule) =>
      importedModule === expectedModule ||
      (isDynamicModule(importedModule) &&
        importedModule.module === expectedModule),
  );
}

function countImportedModule(
  imports: unknown[],
  expectedModule: unknown,
): number {
  return imports.filter(
    (importedModule) =>
      importedModule === expectedModule ||
      (isDynamicModule(importedModule) &&
        importedModule.module === expectedModule),
  ).length;
}

function isDynamicModule(
  value: unknown,
): value is { readonly module: unknown } {
  return typeof value === 'object' && value !== null && 'module' in value;
}
