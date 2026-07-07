// CN: 测试文件，验证 demo-csrf 的行为契约；EN: Test file verifies behavior contracts for demo-csrf.
import { Test, TestingModule } from '@nestjs/testing';

import { DemoCsrfService } from './demo-csrf.service';

// CN: 测试分组：DemoCsrfService；EN: Test group: DemoCsrfService.
describe('DemoCsrfService', () => {
  let service: DemoCsrfService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DemoCsrfService],
    }).compile();

    service = module.get<DemoCsrfService>(DemoCsrfService);
  });

  // CN: 测试用例：documents the browser credential scenarios that need CSRF protection；EN: Test case: documents the browser credential scenarios that need CSRF protection.
  it('documents the browser credential scenarios that need CSRF protection', () => {
    const overview = service.getOverview();

    expect(overview.middleware).toBe('csrf-csrf');
    expect(overview.scenarios).toContain(
      'Cookie-backed browser sessions that mutate server state',
    );
    expect(overview.notNeededFor).toContain(
      'Pure Authorization header APIs where browsers do not attach credentials automatically',
    );
  });

  // CN: 测试用例：returns a protected mutation preview without committing business state；EN: Test case: returns a protected mutation preview without committing business state.
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
