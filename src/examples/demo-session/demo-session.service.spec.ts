import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import type { Request } from 'express';
import {
  DEMO_SESSION_MAX_CART_ITEMS,
  DEMO_SESSION_MAX_FLASH_MESSAGES,
  DEMO_SESSION_MAX_QUANTITY_PER_SKU,
} from './demo-session.types';
import {
  DemoSessionService,
  type DemoExpressSession,
} from './demo-session.service';

describe('DemoSessionService', () => {
  let service: DemoSessionService;
  let session: DemoExpressSession;

  beforeEach(() => {
    service = new DemoSessionService();
    session = {} as DemoExpressSession;
  });

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

  it('regenerates before storing the current user in the session login contract', async () => {
    const regeneratedSession = {} as DemoExpressSession;
    const request = {
      session: {
        regenerate: jest.fn((callback: (error?: Error) => void) => {
          (request as { session: DemoExpressSession }).session =
            regeneratedSession;
          callback();
        }),
      },
    } as unknown as Request;

    const status = await service.login(request, {
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
    expect(request.session).toBe(regeneratedSession);
    expect(regeneratedSession.demoSession?.user).toBeDefined();
  });

  it('preserves bounded anonymous state across login session rotation', async () => {
    const sessionBeforeLogin = {} as DemoExpressSession;
    service.registerVisit(sessionBeforeLogin);
    service.addFlashMessage(sessionBeforeLogin, { message: 'Welcome back' });
    service.addCartItem(sessionBeforeLogin, {
      sku: 'sku_1',
      quantity: 2,
    });
    const regeneratedSession = {} as DemoExpressSession;
    const request = {
      session: Object.assign(sessionBeforeLogin, {
        regenerate: jest.fn((callback: (error?: Error) => void) => {
          (request as { session: DemoExpressSession }).session =
            regeneratedSession;
          callback();
        }),
      }),
    } as unknown as Request;

    const status = await service.login(request, {
      userId: 'user_1',
      displayName: 'Demo User',
    });

    expect(status).toMatchObject({
      authenticated: true,
      visits: 1,
      flashMessages: [expect.objectContaining({ message: 'Welcome back' })],
      cart: [expect.objectContaining({ sku: 'sku_1', quantity: 2 })],
    });
    expect(regeneratedSession.demoSession).not.toBe(
      sessionBeforeLogin.demoSession,
    );
  });

  it('does not carry another authenticated user state into a new login', async () => {
    const regeneratedSession = {} as DemoExpressSession;
    const sessionBeforeLogin = {
      demoSession: {
        visits: 3,
        user: {
          userId: 'previous-user',
          displayName: 'Previous User',
          role: 'member' as const,
          authenticatedAt: new Date().toISOString(),
        },
        flashMessages: [],
        cart: [
          {
            sku: 'previous-cart',
            quantity: 1,
            addedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
      regenerate: jest.fn((callback: (error?: Error) => void) => {
        (request as { session: DemoExpressSession }).session =
          regeneratedSession;
        callback();
      }),
    } as unknown as DemoExpressSession;
    const request = { session: sessionBeforeLogin } as unknown as Request;

    const status = await service.login(request, {
      userId: 'next-user',
      displayName: 'Next User',
    });

    expect(status.user?.userId).toBe('next-user');
    expect(status.visits).toBe(0);
    expect(status.cart).toEqual([]);
  });

  it('does not write authenticated state when session regeneration fails', async () => {
    const sessionBeforeFailure = {
      demoSession: {
        visits: 1,
        flashMessages: [],
        cart: [],
      },
      regenerate: jest.fn((callback: (error?: Error) => void) =>
        callback(new Error('session store unavailable')),
      ),
    } as unknown as DemoExpressSession;
    const request = {
      session: sessionBeforeFailure,
    } as unknown as Request;

    await expect(
      service.login(request, {
        userId: 'user_1',
        displayName: 'Demo User',
      }),
    ).rejects.toThrow('session store unavailable');
    expect(sessionBeforeFailure.demoSession?.user).toBeUndefined();
  });

  it('increments a per-session visit counter without shared state', () => {
    expect(service.registerVisit(session).visits).toBe(1);
    expect(service.registerVisit(session).visits).toBe(2);

    const otherSession = {} as DemoExpressSession;
    expect(service.registerVisit(otherSession).visits).toBe(1);
  });

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

  it('rejects flash messages beyond the bounded unread queue', () => {
    for (let index = 0; index < DEMO_SESSION_MAX_FLASH_MESSAGES; index += 1) {
      service.addFlashMessage(session, { message: `Message ${index}` });
    }

    expect(() =>
      service.addFlashMessage(session, { message: 'One too many' }),
    ).toThrow(ConflictException);
    expect(session.demoSession?.flashMessages).toHaveLength(
      DEMO_SESSION_MAX_FLASH_MESSAGES,
    );
  });

  it('returns only documented nested session fields', () => {
    service.addFlashMessage(session, {
      message: 'Saved successfully',
      level: 'success',
    });
    service.addCartItem(session, {
      sku: 'sku_1',
      name: 'Demo Item',
      quantity: 1,
    });

    Object.assign(session.demoSession?.flashMessages[0] ?? {}, {
      internalTraceId: 'trace_private',
    });
    Object.assign(session.demoSession?.cart[0] ?? {}, {
      internalPrice: 999,
    });

    const status = service.getStatus(session);
    const consumed = service.consumeFlashMessages(session);

    expect(status.flashMessages[0]).not.toHaveProperty('internalTraceId');
    expect(status.cart[0]).not.toHaveProperty('internalPrice');
    expect(consumed.messages[0]).not.toHaveProperty('internalTraceId');
  });

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

  it('rejects cumulative cart quantities above the per-SKU limit', () => {
    service.addCartItem(session, {
      sku: 'sku_1',
      quantity: DEMO_SESSION_MAX_QUANTITY_PER_SKU,
    });

    expect(() =>
      service.addCartItem(session, {
        sku: 'sku_1',
        name: 'Must not be partially applied',
        quantity: 1,
      }),
    ).toThrow(ConflictException);
    expect(session.demoSession?.cart).toEqual([
      expect.objectContaining({
        sku: 'sku_1',
        name: undefined,
        quantity: DEMO_SESSION_MAX_QUANTITY_PER_SKU,
      }),
    ]);
  });

  it('rejects distinct cart items beyond the bounded session capacity', () => {
    for (let index = 0; index < DEMO_SESSION_MAX_CART_ITEMS; index += 1) {
      service.addCartItem(session, {
        sku: `sku_${index}`,
        quantity: 1,
      });
    }

    expect(() =>
      service.addCartItem(session, {
        sku: 'one_item_too_many',
        quantity: 1,
      }),
    ).toThrow(ConflictException);
    expect(session.demoSession?.cart).toHaveLength(DEMO_SESSION_MAX_CART_ITEMS);
  });

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

  it('fails loudly when session middleware is not registered', () => {
    expect(() => service.getStatus(undefined)).toThrow(
      ServiceUnavailableException,
    );
  });
});
