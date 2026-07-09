// CN: 测试文件，验证 demo-config 的行为契约；EN: Test file verifies behavior contracts for demo-config.
import { Test, TestingModule } from '@nestjs/testing';
import { DemoConfigController } from './demo-config.controller';
import { DemoConfigService } from './demo-config.service';

// CN: 测试分组：DemoConfigController；EN: Test group: DemoConfigController.
describe('DemoConfigController', () => {
  const service: jest.Mocked<
    Pick<DemoConfigService, 'getConfigurationExample'>
  > = {
    getConfigurationExample: jest.fn(),
  };
  let controller: DemoConfigController;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoConfigController],
      providers: [
        {
          provide: DemoConfigService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DemoConfigController>(DemoConfigController);
  });

  // CN: 测试用例：should be defined；EN: Test case: should be defined.
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // CN: 测试用例：delegates configuration examples to the service；EN: Test case: delegates configuration examples to the service.
  it('delegates configuration examples to the service', () => {
    service.getConfigurationExample.mockReturnValueOnce({
      appName: 'gnester-lite',
    });

    expect(controller.getConfigurationExample()).toEqual({
      appName: 'gnester-lite',
    });
    expect(service.getConfigurationExample).toHaveBeenCalled();
  });
});
