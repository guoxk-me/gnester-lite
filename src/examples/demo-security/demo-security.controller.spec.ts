import { Test, TestingModule } from '@nestjs/testing';
import { DemoSecurityController } from './demo-security.controller';
import { DemoSecurityService } from './demo-security.service';

describe('DemoSecurityController', () => {
  const service: jest.Mocked<Pick<DemoSecurityService, 'getSecurityOverview'>> =
    {
      getSecurityOverview: jest.fn(),
    };
  let controller: DemoSecurityController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoSecurityController],
      providers: [
        {
          provide: DemoSecurityService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DemoSecurityController>(DemoSecurityController);
  });

  it('delegates the security overview to the service', () => {
    service.getSecurityOverview.mockReturnValueOnce({
      middleware: 'helmet',
      registration:
        'global bootstrap middleware before compression, cookies, sessions, pipes, versioning, and routes',
      headers: [],
      scenarios: [],
      notes: [],
    });

    expect(controller.getSecurityOverview()).toEqual({
      middleware: 'helmet',
      registration:
        'global bootstrap middleware before compression, cookies, sessions, pipes, versioning, and routes',
      headers: [],
      scenarios: [],
      notes: [],
    });
    expect(service.getSecurityOverview).toHaveBeenCalled();
  });
});
