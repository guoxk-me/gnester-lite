// CN: 测试文件，验证 demo-csrf 的行为契约；EN: Test file verifies behavior contracts for demo-csrf.
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';

import { CsrfService } from '../../common/csrf/csrf.service';
import { DemoCsrfController } from './demo-csrf.controller';
import { DemoCsrfService } from './demo-csrf.service';

// CN: 测试分组：DemoCsrfController；EN: Test group: DemoCsrfController.
describe('DemoCsrfController', () => {
  const csrfService: jest.Mocked<
    Pick<CsrfService, 'createToken' | 'getHeaderName'>
  > = {
    createToken: jest.fn(),
    getHeaderName: jest.fn(),
  };
  const demoCsrfService: jest.Mocked<
    Pick<DemoCsrfService, 'getOverview' | 'previewTransfer'>
  > = {
    getOverview: jest.fn(),
    previewTransfer: jest.fn(),
  };
  let controller: DemoCsrfController;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoCsrfController],
      providers: [
        {
          provide: CsrfService,
          useValue: csrfService,
        },
        {
          provide: DemoCsrfService,
          useValue: demoCsrfService,
        },
      ],
    }).compile();

    controller = module.get<DemoCsrfController>(DemoCsrfController);
  });

  // CN: 测试用例：delegates overview rendering to the service；EN: Test case: delegates overview rendering to the service.
  it('delegates overview rendering to the service', () => {
    demoCsrfService.getOverview.mockReturnValueOnce({
      middleware: 'csrf-csrf',
      tokenEndpoint: 'GET /demo-csrf/token',
      protectedEndpoint: 'POST /demo-csrf/transfer-preview',
      headerName: 'x-csrf-token',
      scenarios: [],
      notNeededFor: [],
      notes: [],
    });

    expect(controller.getOverview()).toEqual({
      middleware: 'csrf-csrf',
      tokenEndpoint: 'GET /demo-csrf/token',
      protectedEndpoint: 'POST /demo-csrf/transfer-preview',
      headerName: 'x-csrf-token',
      scenarios: [],
      notNeededFor: [],
      notes: [],
    });
    expect(demoCsrfService.getOverview).toHaveBeenCalled();
  });

  // CN: 测试用例：returns a generated CSRF token for browser clients；EN: Test case: returns a generated CSRF token for browser clients.
  it('returns a generated CSRF token for browser clients', () => {
    const request = {} as Request;
    const response = {} as Response;
    csrfService.createToken.mockReturnValueOnce('csrf-token');
    csrfService.getHeaderName.mockReturnValueOnce('x-csrf-token');

    expect(controller.createToken(request, response)).toEqual({
      csrfToken: 'csrf-token',
      headerName: 'x-csrf-token',
    });
    expect(csrfService.createToken).toHaveBeenCalledWith(request, response);
  });

  // CN: 测试用例：delegates protected mutation previews to the service；EN: Test case: delegates protected mutation previews to the service.
  it('delegates protected mutation previews to the service', () => {
    demoCsrfService.previewTransfer.mockReturnValueOnce({
      accepted: true,
      protectedBy: 'csrf-csrf',
      recipient: 'alice@example.com',
      amount: 25,
    });

    expect(
      controller.previewTransfer({
        recipient: 'alice@example.com',
        amount: 25,
      }),
    ).toEqual({
      accepted: true,
      protectedBy: 'csrf-csrf',
      recipient: 'alice@example.com',
      amount: 25,
    });
  });
});
