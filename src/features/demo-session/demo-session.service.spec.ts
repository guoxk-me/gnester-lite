// CN: 测试文件，验证 demo-session 的行为契约；EN: Test file verifies behavior contracts for demo-session.
import { ServiceUnavailableException } from '@nestjs/common';
import type { Request } from 'express';
import {
  DemoSessionService,
  type DemoExpressSession,
} from './demo-session.service';

// CN: 测试分组：DemoSessionService；EN: Test group: DemoSessionService.
describe('DemoSessionService', () => {
  let service: DemoSessionService;
  let session: DemoExpressSession;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    service = new DemoSessionService();
    session = {} as DemoExpressSession;
  });

  // CN: 测试用例：initializes an anonymous session state contract on first read；EN: Test case: initializes an anonymous session state contract on first read.
  it('initializes an anonymous session state contract on first read', () => {
    expect(service.getStatus(session)).toEqual({
      authenticated: false,
      user: null,
      visits: 0,
      flashMessages: [],
      cart: [],
      cartItemCount: 0,
    });
    expect(session.demoSession).toEqual({
      visits: 0,
      flashMessages: [],
      cart: [],
    });
  });

  // CN: 测试用例：lists the common session application scenarios exposed by the demo；EN: Test case: lists the common session application scenarios exposed by the demo.
  it('lists the common session application scenarios exposed by the demo', () => {
    expect(service.getScenarios()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'login state',
          route: '/demo-session/login',
        }),
        expect.objectContaining({
          name: 'flash messages',
          route: '/demo-session/flash',
        }),
        expect.objectContaining({
          name: 'anonymous shopping cart',
          route: '/demo-session/cart',
        }),
      ]),
    );
  });

  // CN: 测试用例：stores the current user in the session login contract；EN: Test case: stores the current user in the session login contract.
  it('stores the current user in the session login contract', () => {
    const status = service.login(session, {
      userId: 'user_1',
      displayName: 'Demo User',
      role: 'admin',
    });

    expect(status.authenticated).toBe(true);
    expect(status.user).toMatchObject({
      userId: 'user_1',
      displayName: 'Demo User',
      role: 'admin',
    });
  });

  // CN: 测试用例：increments a per-session visit counter without shared state；EN: Test case: increments a per-session visit counter without shared state.
  it('increments a per-session visit counter without shared state', () => {
    expect(service.registerVisit(session).visits).toBe(1);
    expect(service.registerVisit(session).visits).toBe(2);

    const otherSession = {} as DemoExpressSession;
    expect(service.registerVisit(otherSession).visits).toBe(1);
  });

  // CN: 测试用例：consumes flash messages exactly once；EN: Test case: consumes flash messages exactly once.
  it('consumes flash messages exactly once', () => {
    service.addFlashMessage(session, {
      message: 'Saved successfully',
      level: 'success',
    });

    const firstRead = service.consumeFlashMessages(session);
    const secondRead = service.consumeFlashMessages(session);

    expect(firstRead.consumed).toBe(1);
    expect(firstRead.messages[0]).toMatchObject({
      message: 'Saved successfully',
      level: 'success',
    });
    expect(secondRead).toEqual({
      consumed: 0,
      messages: [],
    });
  });

  // CN: 测试用例：keeps shopping cart items in the current session；EN: Test case: keeps shopping cart items in the current session.
  it('keeps shopping cart items in the current session', () => {
    service.addCartItem(session, {
      sku: 'sku_1',
      name: 'Demo Item',
      quantity: 2,
    });
    const status = service.addCartItem(session, {
      sku: 'sku_1',
      quantity: 3,
    });

    expect(status.cart).toHaveLength(1);
    expect(status.cart[0]).toMatchObject({
      sku: 'sku_1',
      name: 'Demo Item',
      quantity: 5,
    });
    expect(status.cartItemCount).toBe(5);
  });

  // CN: 测试用例：destroys the backing express session during logout；EN: Test case: destroys the backing express session during logout.
  it('destroys the backing express session during logout', async () => {
    const destroy = jest.fn((callback: (error?: Error) => void) => callback());
    const request = {
      session: {
        destroy,
      },
    } as unknown as Request;

    await expect(service.logout(request)).resolves.toEqual({
      authenticated: false,
      user: null,
      visits: 0,
      flashMessages: [],
      cart: [],
      cartItemCount: 0,
    });
    expect(destroy).toHaveBeenCalled();
  });

  // CN: 测试用例：fails loudly when session middleware is not registered；EN: Test case: fails loudly when session middleware is not registered.
  it('fails loudly when session middleware is not registered', () => {
    expect(() => service.getStatus(undefined)).toThrow(
      ServiceUnavailableException,
    );
  });
});
