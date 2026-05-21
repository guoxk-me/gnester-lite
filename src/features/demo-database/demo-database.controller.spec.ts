import { Test, TestingModule } from '@nestjs/testing';
import { DemoDatabaseController } from './demo-database.controller';
import { DemoDatabaseService } from './demo-database.service';

describe('DemoDatabaseController', () => {
  let controller: DemoDatabaseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoDatabaseController],
      providers: [
        {
          provide: DemoDatabaseService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<DemoDatabaseController>(DemoDatabaseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
