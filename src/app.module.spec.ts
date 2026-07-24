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

import { AppModule } from './app.module';
import { CommonCacheModule } from './common/cache/cache.module';
import { CacheService } from './common/cache/cache.service';
import { HttpCacheInterceptor } from './common/cache/http-cache.interceptor';
import { CommonQueueModule } from './common/queue/queue.module';
import { CommonQueueService } from './common/queue/queue.service';
import { CommonScheduleModule } from './common/schedule/schedule.module';
import { CommonScheduleService } from './common/schedule/schedule.service';
import { DemosModule } from './features/demos.module';

@Injectable()
class GlobalInfrastructureConsumer {
  constructor(
    readonly cacheService: CacheService,
    readonly queueService: CommonQueueService,
    readonly scheduleService: CommonScheduleService,
    @Inject(CACHE_MANAGER) readonly cacheManager: Cache,
    @Inject(getSharedConfigToken())
    readonly bullConfig: BullRootModuleOptions,
    readonly schedulerRegistry: SchedulerRegistry,
  ) {}
}

@Module({
  providers: [GlobalInfrastructureConsumer],
})
class GlobalInfrastructureConsumerModule {}

describe('AppModule infrastructure boundaries', () => {
  it('keeps cache, queue, and schedule root registration in their common modules', () => {
    expect(
      getDynamicModuleImport(CommonCacheModule, NestCacheModule),
    ).toBeDefined();
    expect(getDynamicModuleImport(CommonQueueModule, BullModule)).toBeDefined();
    expect(
      getDynamicModuleImport(CommonScheduleModule, NestScheduleModule),
    ).toBeDefined();

    expect(Reflect.getMetadata(GLOBAL_MODULE_METADATA, CommonCacheModule)).toBe(
      true,
    );
    expect(Reflect.getMetadata(GLOBAL_MODULE_METADATA, CommonQueueModule)).toBe(
      true,
    );
    expect(
      Reflect.getMetadata(GLOBAL_MODULE_METADATA, CommonScheduleModule),
    ).toBe(true);
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
    expect(countImportedModule(appImports, CommonCacheModule)).toBe(1);
    expect(countImportedModule(appImports, CommonQueueModule)).toBe(1);
    expect(countImportedModule(appImports, CommonScheduleModule)).toBe(1);
    expect(countImportedModule(appImports, DemosModule)).toBe(1);
  });

  it('exposes one shared provider instance to sibling feature modules', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
          load: [
            () => ({
              NODE_ENV: 'test',
              REDIS_URL: 'redis://127.0.0.1:6379',
              cache: {
                ttl: 0,
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
        CommonCacheModule,
        CommonQueueModule,
        CommonScheduleModule,
        GlobalInfrastructureConsumerModule,
      ],
    }).compile();

    try {
      const consumer = moduleRef.get(GlobalInfrastructureConsumer);

      expect(consumer.cacheService).toBe(moduleRef.get(CacheService));
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
