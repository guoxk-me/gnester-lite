import type { Mocked } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Request } from 'express';

import { DemoSessionController } from './demo-session.controller.js';
import {
  DemoSessionService,
  type DemoExpressSession,
} from './demo-session.service.js';
import { CreateDemoSessionFlashDto } from './dto/create-demo-session-flash.dto.js';
import { CreateDemoSessionLoginDto } from './dto/create-demo-session-login.dto.js';
import { DemoSessionCartItemParamsDto } from './dto/demo-session-cart-item-params.dto.js';

describe('DemoSessionController', () => {
  const state = {
    authenticated: false,
    user: null,
    visits: 0,
    flashMessages: [],
    cart: [],
    cartItemCount: 0,
  };
  const service = {
    getScenarios: vi.fn(),
    getStatus: vi.fn(),
    login: vi.fn(),
    registerVisit: vi.fn(),
    addFlashMessage: vi.fn(),
    consumeFlashMessages: vi.fn(),
    getCart: vi.fn(),
    addCartItem: vi.fn(),
    removeCartItem: vi.fn(),
    logout: vi.fn(),
  } as Mocked<
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
  >;
  let controller: DemoSessionController;
  let session: DemoExpressSession;

  beforeEach(async () => {
    vi.clearAllMocks();
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
        route: '/api/demo-session/login',
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
