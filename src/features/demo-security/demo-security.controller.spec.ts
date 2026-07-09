// CN: 测试文件，验证 demo-security 的行为契约；EN: Test file verifies behavior contracts for demo-security.
import { Test, TestingModule } from '@nestjs/testing';
import { DemoSecurityController } from './demo-security.controller';
import { DemoSecurityService } from './demo-security.service';

// CN: 测试分组：DemoSecurityController；EN: Test group: DemoSecurityController.
describe('DemoSecurityController', () => {
  const service: jest.Mocked<Pick<DemoSecurityService, 'getSecurityOverview'>> =
    {
      getSecurityOverview: jest.fn(),
    };
  let controller: DemoSecurityController;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
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

  // CN: 测试用例：delegates the security overview to the service；EN: Test case: delegates the security overview to the service.
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
