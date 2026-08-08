import { Test, TestingModule } from '@nestjs/testing';
import { DemoConfigController } from './demo-config.controller';
import { DemoConfigService } from './demo-config.service';

describe('DemoConfigController', () => {
  const service: jest.Mocked<
    Pick<DemoConfigService, 'getConfigurationExample'>
  > = {
    getConfigurationExample: jest.fn(),
  };
  let controller: DemoConfigController;

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

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

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
