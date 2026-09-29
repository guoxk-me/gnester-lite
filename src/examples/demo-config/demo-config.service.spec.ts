import type { Mocked } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DemoConfigService } from './demo-config.service.js';

describe('DemoConfigService', () => {
  const configService = {
    getOrThrow: vi.fn(),
  } as unknown as Mocked<Pick<ConfigService, 'getOrThrow'>>;
  let service: DemoConfigService;

  beforeEach(async () => {
    vi.clearAllMocks();
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

  it('reads app configuration through ConfigService', () => {
    expect(service.getConfigurationExample()).toEqual({
      appName: 'gnester-lite',
    });
    expect(configService.getOrThrow).toHaveBeenCalledWith('app.name');
  });
});
