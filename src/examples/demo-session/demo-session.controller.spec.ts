import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Request } from 'express';

import { DemoSessionController } from './demo-session.controller';
import {
  DemoSessionService,
  type DemoExpressSession,
} from './demo-session.service';
import { CreateDemoSessionFlashDto } from './dto/create-demo-session-flash.dto';
import { CreateDemoSessionLoginDto } from './dto/create-demo-session-login.dto';
import { DemoSessionCartItemParamsDto } from './dto/demo-session-cart-item-params.dto';

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

  it('delegates session status reads to the service', () => {
    service.getStatus.mockReturnValueOnce(state);

    expect(controller.getStatus(session)).toEqual(state);
    expect(service.getStatus).toHaveBeenCalledWith(session);
  });

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

  it('delegates login state updates to the service', async () => {
    const dto = { userId: 'user_1', displayName: 'Demo User' };
    const request = { session } as unknown as Request;
    service.login.mockResolvedValueOnce(state);

    await expect(controller.login(request, dto)).resolves.toEqual(state);
    expect(service.login).toHaveBeenCalledWith(request, dto);
  });

  it('rejects a whitespace-only session display name', async () => {
    const dto = plainToInstance(CreateDemoSessionLoginDto, {
      userId: 'user_1',
      displayName: '   ',
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('delegates visit counter updates to the service', () => {
    service.registerVisit.mockReturnValueOnce(state);

    expect(controller.registerVisit(session)).toEqual(state);
    expect(service.registerVisit).toHaveBeenCalledWith(session);
  });

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

  it('rejects a whitespace-only flash message', async () => {
    const dto = plainToInstance(CreateDemoSessionFlashDto, { message: '   ' });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('delegates shopping cart operations to the service', () => {
    const dto = { sku: 'sku_1', quantity: 2 };
    service.getCart.mockReturnValueOnce([]);
    service.addCartItem.mockReturnValueOnce(state);
    service.removeCartItem.mockReturnValueOnce(state);

    expect(controller.getCart(session)).toEqual([]);
    expect(controller.addCartItem(session, dto)).toEqual(state);
    expect(controller.removeCartItem(session, { sku: 'sku_1' })).toEqual(state);
    expect(service.getCart).toHaveBeenCalledWith(session);
    expect(service.addCartItem).toHaveBeenCalledWith(session, dto);
    expect(service.removeCartItem).toHaveBeenCalledWith(session, 'sku_1');
  });

  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
    ['invalid-character', 'bad/sku'],
    ['overlong', 'x'.repeat(65)],
  ])('rejects an %s cart SKU path', async (_scenario, sku) => {
    const params = plainToInstance(DemoSessionCartItemParamsDto, { sku });

    await expect(validate(params)).resolves.not.toHaveLength(0);
  });

  it('delegates logout to the service with the raw request', async () => {
    const request = {} as Request;
    service.logout.mockResolvedValueOnce(state);

    await expect(controller.logout(request)).resolves.toEqual(state);
    expect(service.logout).toHaveBeenCalledWith(request);
  });
});
