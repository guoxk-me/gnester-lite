import { Test, TestingModule } from '@nestjs/testing';
import { DemoConfigController } from './demo-config.controller';
import { DemoConfigService } from './demo-config.service';

describe('DemoConfigController', () => {
  let controller: DemoConfigController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoConfigController],
      providers: [
        {
          provide: DemoConfigService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get(DemoConfigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
