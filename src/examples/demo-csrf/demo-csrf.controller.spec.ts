import type { Mocked } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Request, Response } from 'express';

import { CsrfService } from '../../csrf/csrf.service.js';
import { DemoCsrfController } from './demo-csrf.controller.js';
import { DemoCsrfService } from './demo-csrf.service.js';
import {
  CreateDemoCsrfTransferDto,
  DEMO_CSRF_RECIPIENT_MAX_LENGTH,
} from './dto/create-demo-csrf-transfer.dto.js';

describe('DemoCsrfController', () => {
  const csrfService = {
    createToken: vi.fn(),
    getHeaderName: vi.fn(),
  } as Mocked<Pick<CsrfService, 'createToken' | 'getHeaderName'>>;
  const demoCsrfService = {
    getOverview: vi.fn(),
    previewTransfer: vi.fn(),
  } as Mocked<Pick<DemoCsrfService, 'getOverview' | 'previewTransfer'>>;
  let controller: DemoCsrfController;

  beforeEach(async () => {
    vi.clearAllMocks();

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

  it('returns a generated CSRF token for browser clients', () => {
    const request = {} as Request;
    const setHeader = vi.fn();
    const response = {
      setHeader,
    } as unknown as Response;
    csrfService.createToken.mockReturnValueOnce('csrf-token');
    csrfService.getHeaderName.mockReturnValueOnce('x-csrf-token');

    expect(controller.createToken(request, response)).toEqual({
      csrfToken: 'csrf-token',
      headerName: 'x-csrf-token',
    });
    expect(csrfService.createToken).toHaveBeenCalledWith(request, response);
    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });

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

  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
    ['overlong', 'x'.repeat(DEMO_CSRF_RECIPIENT_MAX_LENGTH + 1)],
  ])('rejects a %s transfer recipient', async (_scenario, recipient) => {
    const dto = plainToInstance(CreateDemoCsrfTransferDto, {
      recipient,
      amount: 25,
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
    expect(demoCsrfService.previewTransfer).not.toHaveBeenCalled();
  });
});
