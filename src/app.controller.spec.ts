// CN: 测试文件，验证 root app 的行为契约；EN: Test file verifies behavior contracts for root app.
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// CN: 测试分组：AppController；EN: Test group: AppController.
describe('AppController', () => {
  let appController: AppController;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    jest.clearAllMocks();

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  // CN: 测试分组：root；EN: Test group: root.
  describe('root', () => {
    // CN: 测试用例：should return "Hello World!"；EN: Test case: should return "Hello World!".
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
