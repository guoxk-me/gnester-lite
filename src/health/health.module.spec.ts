import { type DynamicModule, Logger } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { HealthCheckService, TerminusModule } from '@nestjs/terminus';

import { HealthModule } from './health.module.js';

describe('HealthModule', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('disables the unbounded Terminus failure logger', async () => {
    const moduleImports = (Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      HealthModule,
    ) ?? []) as unknown[];
    const terminusImport = moduleImports.find(
      (moduleImport): moduleImport is DynamicModule =>
        typeof moduleImport === 'object' &&
        moduleImport !== null &&
        'module' in moduleImport &&
        moduleImport.module === TerminusModule,
    );

    if (!terminusImport) {
      throw new Error('HealthModule must import TerminusModule');
    }

    const moduleRef = await Test.createTestingModule({
      imports: [terminusImport],
    }).compile();

    try {
      const frameworkErrorLogger = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      await expect(
        moduleRef.get(HealthCheckService).check([
          () =>
            Promise.resolve({
              database: {
                status: 'down' as const,
                message: 'Database ping failed',
              },
            }),
        ]),
      ).rejects.toMatchObject({ status: 503 });
      expect(frameworkErrorLogger).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });
});
