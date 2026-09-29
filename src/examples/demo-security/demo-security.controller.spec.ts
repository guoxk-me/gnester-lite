import type { Mocked } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { DemoSecurityController } from './demo-security.controller.js';
import { DemoSecurityService } from './demo-security.service.js';

describe('DemoSecurityController', () => {
  const service = {
      getSecurityOverview: vi.fn(),
    } as Mocked<Pick<DemoSecurityService, 'getSecurityOverview'>>;
  let controller: DemoSecurityController;

  beforeEach(async () => {
    vi.clearAllMocks();

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
