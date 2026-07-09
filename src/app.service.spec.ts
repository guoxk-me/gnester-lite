// CN: 测试文件，验证 root app 的行为契约；EN: Test file verifies behavior contracts for root app.
import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

// CN: 测试分组：AppService；EN: Test group: AppService.
describe('AppService', () => {
  let service: AppService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get(AppService);
  });

  // CN: 测试用例：returns a greeting；EN: Test case: returns a greeting.
  it('returns a greeting', () => {
    expect(service.getHello()).toBe('Hello World!');
  });
});
