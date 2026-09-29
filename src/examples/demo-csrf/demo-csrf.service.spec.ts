import type { Mocked } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';

import { CsrfService } from '../../csrf/csrf.service.js';
import { DemoCsrfService } from './demo-csrf.service.js';

describe('DemoCsrfService', () => {
  const csrfService = {
    getHeaderName: vi.fn(),
  } as Mocked<Pick<CsrfService, 'getHeaderName'>>;
  let service: DemoCsrfService;

  beforeEach(async () => {
    vi.clearAllMocks();
    csrfService.getHeaderName.mockReturnValue('x-configured-csrf');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemoCsrfService,
        {
          provide: CsrfService,
          useValue: csrfService,
        },
      ],
    }).compile();

    service = module.get<DemoCsrfService>(DemoCsrfService);
  });

  it('documents the browser credential scenarios that need CSRF protection', () => {
    const overview = service.getOverview();

    expect(overview.middleware).toBe('csrf-csrf');
    expect(overview.headerName).toBe('x-configured-csrf');
    expect(overview.notes[0]).toContain('x-configured-csrf');
    expect(overview.scenarios).toContain(
      'Cookie-backed browser sessions that mutate server state',
    );
    expect(overview.notNeededFor).toContain(
      'Pure Authorization header APIs where browsers do not attach credentials automatically',
    );
  });

  it('returns a protected mutation preview without committing business state', () => {
    expect(
      service.previewTransfer({
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
