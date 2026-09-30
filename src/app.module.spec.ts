import { IdentityModule } from './modules/identity/identity.module.js';
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
import {
  ScheduleModule as NestScheduleModule,
  SchedulerRegistry,
} from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import type { Cache } from 'cache-manager';

import { AppModule } from './app.module.js';
import { CacheModule } from './infra/cache/cache.module.js';
import { CacheService } from './infra/cache/cache.service.js';
import { HttpCacheInterceptor } from './infra/cache/http-cache.interceptor.js';
import { HealthModule } from './infra/health/health.module.js';
import { HttpClientModule } from './infra/http-client/http-client.module.js';
import { QueueModule } from './infra/queue/queue.module.js';
import { QueueService } from './infra/queue/queue.service.js';
import { ScheduleModule } from './infra/schedule/schedule.module.js';
import { ScheduleService } from './infra/schedule/schedule.service.js';

@Injectable()
class ExplicitInfrastructureConsumer {
  constructor(
    readonly cacheService: CacheService,
    readonly httpService: HttpService,
    readonly queueService: QueueService,
    readonly scheduleService: ScheduleService,
    @Inject(CACHE_MANAGER) readonly cacheManager: Cache,
    @Inject(getSharedConfigToken())
    readonly bullConfig: BullRootModuleOptions,
    readonly schedulerRegistry: SchedulerRegistry,
  ) {}
}

@Module({
  // AI modified: the consumer module declares every infrastructure provider it injects.
  imports: [CacheModule, HttpClientModule, QueueModule, ScheduleModule],
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

  it('keeps root registration inside explicit capability modules', () => {
    expect(getDynamicModuleImport(CacheModule, NestCacheModule)).toBeDefined();
    expect(getDynamicModuleImport(HttpClientModule, HttpModule)).toBeDefined();
    expect(getDynamicModuleImport(QueueModule, BullModule)).toBeDefined();
    expect(
      getDynamicModuleImport(ScheduleModule, NestScheduleModule),
    ).toBeDefined();

    expect(
      Reflect.getMetadata(GLOBAL_MODULE_METADATA, CacheModule),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(GLOBAL_MODULE_METADATA, HttpClientModule),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(GLOBAL_MODULE_METADATA, QueueModule),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(GLOBAL_MODULE_METADATA, ScheduleModule),
    ).toBeUndefined();
    expect(getModuleExports(CacheModule)).toEqual([
      NestCacheModule,
      CacheService,
      HttpCacheInterceptor,
    ]);
    expect(getModuleExports(QueueModule)).toEqual([BullModule, QueueService]);
    expect(getModuleExports(ScheduleModule)).toEqual([
      NestScheduleModule,
      ScheduleService,
    ]);

    const appImports = getModuleImports(AppModule);

    expect(hasImportedModule(appImports, NestCacheModule)).toBe(false);
    expect(hasImportedModule(appImports, BullModule)).toBe(false);
    expect(hasImportedModule(appImports, NestScheduleModule)).toBe(false);
    expect(countImportedModule(appImports, CacheModule)).toBe(0);
    expect(countImportedModule(appImports, HttpClientModule)).toBe(0);
    expect(countImportedModule(appImports, QueueModule)).toBe(0);
    expect(countImportedModule(appImports, ScheduleModule)).toBe(0);
    expect(countImportedModule(appImports, IdentityModule)).toBe(1);
  });

  it('makes every feature and readiness module declare its capability imports', () => {
    expect(
      countImportedModule(getModuleImports(HealthModule), CacheModule),
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
      expect(consumer.queueService).toBe(moduleRef.get(QueueService));
      expect(consumer.scheduleService).toBe(moduleRef.get(ScheduleService));
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
