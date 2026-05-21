import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DemoConfigService } from './demo-config.service';

describe('DemoConfigService', () => {
  const configService = {
    getOrThrow: jest.fn(),
  };
  let service: DemoConfigService;

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

    service = module.get(DemoConfigService);
  });

  it('reads app configuration through ConfigService', () => {
    expect(service.getConfigurationExample()).toEqual({
      appName: 'gnester-lite',
    });
    expect(configService.getOrThrow).toHaveBeenCalledWith('app.name');
  });
});
