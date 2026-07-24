import { MODULE_METADATA } from '@nestjs/common/constants';

interface DemosModuleExports {
  DemosModule: object;
}

const testSafeDemoNames = [
  'DemoAuthorizationModule',
  'DemoAuthModule',
  'DemoCacheModule',
  'DemoConfigModule',
  'DemoCorsModule',
  'DemoCookiesModule',
  'DemoCsrfModule',
  'DemoCryptoModule',
  'DemoDatabaseModule',
  'DemoEventsModule',
  'DemoHttpModule',
  'DemoRateLimitModule',
  'DemoScheduleModule',
  'DemoSecurityModule',
  'DemoSentryModule',
  'DemoSerializationModule',
  'DemoSessionModule',
  'DemoSseModule',
  'DemoStreamingFilesModule',
  'DemoUploadModule',
  'DemoWebsocketModule',
];

describe('DemosModule', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('aggregates every test-safe demo feature', async () => {
    await expect(getDemoImportNames('test')).resolves.toEqual(
      testSafeDemoNames,
    );
  });

  it('includes the queue demo outside the test environment', async () => {
    const productionDemoNames = [...testSafeDemoNames];
    productionDemoNames.splice(11, 0, 'DemoQueueModule');

    await expect(getDemoImportNames('production')).resolves.toEqual(
      productionDemoNames,
    );
  });
});

async function getDemoImportNames(nodeEnv: string): Promise<string[]> {
  jest.resetModules();
  process.env.NODE_ENV = nodeEnv;

  const modulePath = './demos.module';
  const { DemosModule } = (await import(modulePath)) as DemosModuleExports;
  const imports = (Reflect.getMetadata(MODULE_METADATA.IMPORTS, DemosModule) ??
    []) as unknown[];

  return imports.map((importedModule) => {
    if (typeof importedModule !== 'function') {
      throw new Error('DemosModule contains a non-module import.');
    }

    return importedModule.name;
  });
}
