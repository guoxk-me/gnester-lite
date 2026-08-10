import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';

import { DemoCorsController } from './demo-cors.controller';
import { DemoCorsService } from './demo-cors.service';

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

  it('delegates scenario discovery to the service', () => {
    service.getScenarios.mockReturnValueOnce([]);

    expect(controller.getScenarios()).toEqual([]);
    expect(service.getScenarios).toHaveBeenCalled();
  });

  it('adds an exposed trace header for public resource examples', () => {
    const resource = {
      id: 'public-catalog',
      visibility: 'public' as const,
      corsRequirement: 'Expose X-Demo-Cors-Trace to browser JavaScript.',
    };
    service.getPublicResource.mockReturnValueOnce(resource);

    expect(
      controller.getPublicResource(response as unknown as Response),
    ).toEqual(resource);
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Demo-Cors-Trace',
      'demo-cors-public-resource',
    );
  });

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
