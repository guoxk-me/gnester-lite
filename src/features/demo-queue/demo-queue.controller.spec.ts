// CN: 测试文件，验证 demo-queue 的行为契约；EN: Test file verifies behavior contracts for demo-queue.
import { Test, TestingModule } from '@nestjs/testing';
import { DemoQueueController } from './demo-queue.controller';
import { DemoQueueService } from './demo-queue.service';

// CN: 测试分组：DemoQueueController；EN: Test group: DemoQueueController.
describe('DemoQueueController', () => {
  const service: jest.Mocked<
    Pick<DemoQueueService, 'enqueueEmail' | 'getStatus' | 'pause' | 'resume'>
  > = {
    enqueueEmail: jest.fn(),
    getStatus: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
  };
  let controller: DemoQueueController;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoQueueController],
      providers: [
        {
          provide: DemoQueueService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DemoQueueController>(DemoQueueController);
  });

  // CN: 测试用例：delegates demo email job creation to the service；EN: Test case: delegates demo email job creation to the service.
  it('delegates demo email job creation to the service', async () => {
    const dto = {
      to: 'user@example.com',
      subject: 'Welcome',
    };
    const job = {
      id: '1',
      queue: 'demo',
      name: 'send-email',
      enqueuedAt: '2026-05-28T00:00:00.000Z',
    };
    service.enqueueEmail.mockResolvedValueOnce(job);

    await expect(controller.enqueueEmail(dto)).resolves.toEqual(job);
    expect(service.enqueueEmail).toHaveBeenCalledWith(dto);
  });

  // CN: 测试用例：delegates queue status reads to the service；EN: Test case: delegates queue status reads to the service.
  it('delegates queue status reads to the service', async () => {
    const status = {
      enabled: true,
      queue: 'demo',
      counts: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        prioritized: 0,
        paused: 0,
        waitingChildren: 0,
      },
    };
    service.getStatus.mockResolvedValueOnce(status);

    await expect(controller.getStatus()).resolves.toEqual(status);
    expect(service.getStatus).toHaveBeenCalled();
  });

  // CN: 测试用例：delegates queue pause and resume commands to the service；EN: Test case: delegates queue pause and resume commands to the service.
  it('delegates queue pause and resume commands to the service', async () => {
    service.pause.mockResolvedValueOnce(undefined);
    service.resume.mockResolvedValueOnce(undefined);

    await expect(controller.pause()).resolves.toBeUndefined();
    await expect(controller.resume()).resolves.toBeUndefined();
    expect(service.pause).toHaveBeenCalled();
    expect(service.resume).toHaveBeenCalled();
  });
});
