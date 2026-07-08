// CN: 测试文件，验证 demo-cors 的行为契约；EN: Test file verifies behavior contracts for demo-cors.
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';

import { DemoCorsController } from './demo-cors.controller';
import { DemoCorsService } from './demo-cors.service';

// CN: 测试分组：DemoCorsController；EN: Test group: DemoCorsController.
describe('DemoCorsController', () => {
  const service: jest.Mocked<
    Pick<
      DemoCorsService,
      'getScenarios' | 'getPublicResource' | 'getCredentialedResource'
    >
  > = {
    getScenarios: jest.fn(),
    getPublicResource: jest.fn(),
    getCredentialedResource: jest.fn(),
  };
  const response = {
    setHeader: jest.fn(),
  } as unknown as jest.Mocked<Pick<Response, 'setHeader'>>;
  let controller: DemoCorsController;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoCorsController],
      providers: [
        {
          provide: DemoCorsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DemoCorsController>(DemoCorsController);
  });

  // CN: 测试用例：delegates scenario discovery to the service；EN: Test case: delegates scenario discovery to the service.
  it('delegates scenario discovery to the service', () => {
    service.getScenarios.mockReturnValueOnce([]);

    expect(controller.getScenarios()).toEqual([]);
    expect(service.getScenarios).toHaveBeenCalled();
  });

  // CN: 测试用例：adds an exposed trace header for public resource examples；EN: Test case: adds an exposed trace header for public resource examples.
  it('adds an exposed trace header for public resource examples', () => {
    const resource = {
      id: 'public-catalog',
      visibility: 'public' as const,
      corsRequirement: 'Expose X-Demo-Cors-Trace to browser JavaScript.',
    };
    service.getPublicResource.mockReturnValueOnce(resource);

    expect(controller.getPublicResource(response as Response)).toEqual(
      resource,
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Demo-Cors-Trace',
      'demo-cors-public-resource',
    );
  });

  // CN: 测试用例：delegates credentialed resource examples with session presence；EN: Test case: delegates credentialed resource examples with session presence.
  it('delegates credentialed resource examples with session presence', () => {
    const resource = {
      id: 'credentialed-profile',
      visibility: 'credentialed' as const,
      hasSession: true,
      corsRequirement:
        'Use explicit origins and Access-Control-Allow-Credentials.',
    };
    service.getCredentialedResource.mockReturnValueOnce(resource);

    expect(controller.getCredentialedResource({ userId: 'demo-user' })).toEqual(
      resource,
    );
    expect(service.getCredentialedResource).toHaveBeenCalledWith(true);
  });
});
