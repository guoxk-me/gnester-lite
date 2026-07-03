// CN: 测试文件，验证 demo-session 的行为契约；EN: Test file verifies behavior contracts for demo-session.
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';

import { DemoSessionController } from './demo-session.controller';
import {
  DemoSessionService,
  type DemoExpressSession,
} from './demo-session.service';

// CN: 测试分组：DemoSessionController；EN: Test group: DemoSessionController.
describe('DemoSessionController', () => {
  const state = {
    authenticated: false,
    user: null,
    visits: 0,
    flashMessages: [],
    cart: [],
    cartItemCount: 0,
  };
  const service: jest.Mocked<
    Pick<
      DemoSessionService,
      | 'getScenarios'
      | 'getStatus'
      | 'login'
      | 'registerVisit'
      | 'addFlashMessage'
      | 'consumeFlashMessages'
      | 'getCart'
      | 'addCartItem'
      | 'removeCartItem'
      | 'logout'
    >
  > = {
    getScenarios: jest.fn(),
    getStatus: jest.fn(),
    login: jest.fn(),
    registerVisit: jest.fn(),
    addFlashMessage: jest.fn(),
    consumeFlashMessages: jest.fn(),
    getCart: jest.fn(),
    addCartItem: jest.fn(),
    removeCartItem: jest.fn(),
    logout: jest.fn(),
  };
  let controller: DemoSessionController;
  let session: DemoExpressSession;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    jest.clearAllMocks();
    session = {} as DemoExpressSession;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoSessionController],
      providers: [
        {
          provide: DemoSessionService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DemoSessionController>(DemoSessionController);
  });

  // CN: 测试用例：delegates session status reads to the service；EN: Test case: delegates session status reads to the service.
  it('delegates session status reads to the service', () => {
    service.getStatus.mockReturnValueOnce(state);

    expect(controller.getStatus(session)).toEqual(state);
    expect(service.getStatus).toHaveBeenCalledWith(session);
  });

  // CN: 测试用例：delegates scenario listing to the service；EN: Test case: delegates scenario listing to the service.
  it('delegates scenario listing to the service', () => {
    const scenarios = [
      {
        name: 'login state',
        method: 'POST',
        route: '/demo-session/login',
        useCase: 'Store login state.',
        nestPattern: 'Use @Session().',
      },
    ];
    service.getScenarios.mockReturnValueOnce(scenarios);

    expect(controller.getScenarios()).toEqual(scenarios);
    expect(service.getScenarios).toHaveBeenCalled();
  });

  // CN: 测试用例：delegates login state updates to the service；EN: Test case: delegates login state updates to the service.
  it('delegates login state updates to the service', () => {
    const dto = { userId: 'user_1', displayName: 'Demo User' };
    service.login.mockReturnValueOnce(state);

    expect(controller.login(session, dto)).toEqual(state);
    expect(service.login).toHaveBeenCalledWith(session, dto);
  });

  // CN: 测试用例：delegates visit counter updates to the service；EN: Test case: delegates visit counter updates to the service.
  it('delegates visit counter updates to the service', () => {
    service.registerVisit.mockReturnValueOnce(state);

    expect(controller.registerVisit(session)).toEqual(state);
    expect(service.registerVisit).toHaveBeenCalledWith(session);
  });

  // CN: 测试用例：delegates one-time flash messages to the service；EN: Test case: delegates one-time flash messages to the service.
  it('delegates one-time flash messages to the service', () => {
    const dto = { message: 'Saved successfully', level: 'success' as const };
    service.addFlashMessage.mockReturnValueOnce(state);
    service.consumeFlashMessages.mockReturnValueOnce({
      consumed: 1,
      messages: [],
    });

    expect(controller.addFlashMessage(session, dto)).toEqual(state);
    expect(controller.consumeFlashMessages(session)).toEqual({
      consumed: 1,
      messages: [],
    });
    expect(service.addFlashMessage).toHaveBeenCalledWith(session, dto);
    expect(service.consumeFlashMessages).toHaveBeenCalledWith(session);
  });

  // CN: 测试用例：delegates shopping cart operations to the service；EN: Test case: delegates shopping cart operations to the service.
  it('delegates shopping cart operations to the service', () => {
    const dto = { sku: 'sku_1', quantity: 2 };
    service.getCart.mockReturnValueOnce([]);
    service.addCartItem.mockReturnValueOnce(state);
    service.removeCartItem.mockReturnValueOnce(state);

    expect(controller.getCart(session)).toEqual([]);
    expect(controller.addCartItem(session, dto)).toEqual(state);
    expect(controller.removeCartItem(session, 'sku_1')).toEqual(state);
    expect(service.getCart).toHaveBeenCalledWith(session);
    expect(service.addCartItem).toHaveBeenCalledWith(session, dto);
    expect(service.removeCartItem).toHaveBeenCalledWith(session, 'sku_1');
  });

  // CN: 测试用例：delegates logout to the service with the raw request；EN: Test case: delegates logout to the service with the raw request.
  it('delegates logout to the service with the raw request', async () => {
    const request = {} as Request;
    service.logout.mockResolvedValueOnce(state);

    await expect(controller.logout(request)).resolves.toEqual(state);
    expect(service.logout).toHaveBeenCalledWith(request);
  });
});
