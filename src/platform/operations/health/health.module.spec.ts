import { type DynamicModule, Logger } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { HealthCheckService, TerminusModule } from '@nestjs/terminus';

import { CommonHealthModule } from './health.module';

describe('CommonHealthModule', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('disables the unbounded Terminus failure logger', async () => {
    const moduleImports = (Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      CommonHealthModule,
    ) ?? []) as unknown[];
    const terminusImport = moduleImports.find(
      (moduleImport): moduleImport is DynamicModule =>
        typeof moduleImport === 'object' &&
        moduleImport !== null &&
        'module' in moduleImport &&
        moduleImport.module === TerminusModule,
    );

    if (!terminusImport) {
      throw new Error('CommonHealthModule must import TerminusModule');
    }

    const moduleRef = await Test.createTestingModule({
      imports: [terminusImport],
    }).compile();

    try {
      const frameworkErrorLogger = jest
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
