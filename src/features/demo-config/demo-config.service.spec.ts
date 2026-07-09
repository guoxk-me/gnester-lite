// CN: 测试文件，验证 demo-config 的行为契约；EN: Test file verifies behavior contracts for demo-config.
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DemoConfigService } from './demo-config.service';

// CN: 测试分组：DemoConfigService；EN: Test group: DemoConfigService.
describe('DemoConfigService', () => {
  const configService: jest.Mocked<Pick<ConfigService, 'getOrThrow'>> = {
    getOrThrow: jest.fn(),
  };
  let service: DemoConfigService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    jest.clearAllMocks();
    configService.getOrThrow.mockReturnValue('gnester-lite');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemoConfigService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<DemoConfigService>(DemoConfigService);
  });

  // CN: 测试用例：reads app configuration through ConfigService；EN: Test case: reads app configuration through ConfigService.
  it('reads app configuration through ConfigService', () => {
    expect(service.getConfigurationExample()).toEqual({
      appName: 'gnester-lite',
    });
    expect(configService.getOrThrow).toHaveBeenCalledWith('app.name');
  });
});
