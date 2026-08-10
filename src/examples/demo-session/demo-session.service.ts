import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Session, SessionData } from 'express-session';

import { AddDemoSessionCartItemDto } from './dto/add-demo-session-cart-item.dto';
import { CreateDemoSessionFlashDto } from './dto/create-demo-session-flash.dto';
import { CreateDemoSessionLoginDto } from './dto/create-demo-session-login.dto';
import { DemoSessionCartItemDto } from './dto/demo-session-cart-item.dto';
import {
  DemoSessionFlashMessagesDto,
  DemoSessionStateDto,
} from './dto/demo-session-state.dto';
import { DemoSessionScenarioDto } from './dto/demo-session-scenario.dto';
import {
  DEMO_SESSION_MAX_CART_ITEMS,
  DEMO_SESSION_MAX_FLASH_MESSAGES,
  DEMO_SESSION_MAX_QUANTITY_PER_SKU,
  type DemoSessionState,
} from './demo-session.types';

export type DemoExpressSession = Session & Partial<SessionData>;

@Injectable()
export class DemoSessionService {
  getScenarios(): DemoSessionScenarioDto[] {
    return [
      {
        name: 'read current session state',
        method: 'GET',
        route: '/demo-session',
        useCase:
          'Return the current user, visit count, flash queue, and cart stored in this browser session.',
        nestPattern:
          'Use @Session() in the controller and keep session mutation in a service.',
      },
      {
        name: 'login state',
        method: 'POST',
        route: '/demo-session/login',
        useCase:
          'Store a lightweight authenticated user profile after login or an OAuth callback.',
        nestPattern:
          'Validate the request body with a DTO, then write only serializable state into req.session.',
      },
      {
        name: 'per-user visit counter',
        method: 'POST',
        route: '/demo-session/visits',
        useCase:
          'Track short-lived per-browser counters without creating database rows.',
        nestPattern:
          'Treat the Express session as request-scoped state and avoid process-global variables.',
      },
      {
        name: 'flash messages',
        method: 'POST / GET',
        route: '/demo-session/flash',
        useCase:
          'Show one-time success or error messages after redirects or form submissions.',
        nestPattern:
          'Store messages in session and clear them on the first read.',
      },
      {
        name: 'anonymous shopping cart',
        method: 'GET / POST / DELETE',
        route: '/demo-session/cart',
        useCase:
          'Keep cart contents for anonymous users before checkout or account login.',
        nestPattern:
          'Use DTO validation for mutations and keep merge/remove rules in the service.',
      },
      {
        name: 'logout',
        method: 'DELETE',
        route: '/demo-session',
        useCase:
          'Destroy all server-side session state and force a clean anonymous session.',
        nestPattern:
          'Use @Req() only when the raw Express session API such as destroy() is required.',
      },
    ];
  }

  getStatus(session: DemoExpressSession | undefined): DemoSessionStateDto {
    return this.toStateDto(this.getOrCreateState(session));
  }

  async login(
    request: Request,
    dto: CreateDemoSessionLoginDto,
  ): Promise<DemoSessionStateDto> {
    const previousState = request.session?.demoSession;
    // AI modified: preserve bounded anonymous state across the fixation-safe session rotation.
    const anonymousState =
      previousState !== undefined && previousState.user === undefined
        ? this.copyAnonymousState(previousState)
        : undefined;
    // AI modified: rotate the session identifier before authenticated state is written.
    const session = await this.regenerateSession(request);
    session.demoSession = anonymousState ?? this.createInitialState();
    const state = session.demoSession;

    state.user = {
      userId: dto.userId,
      displayName: dto.displayName,
      role: dto.role ?? 'member',
      authenticatedAt: new Date().toISOString(),
    };

    return this.toStateDto(state);
  }

  registerVisit(session: DemoExpressSession | undefined): DemoSessionStateDto {
    const state = this.getOrCreateState(session);

    state.visits += 1;

    return this.toStateDto(state);
  }

  addFlashMessage(
    session: DemoExpressSession | undefined,
    dto: CreateDemoSessionFlashDto,
  ): DemoSessionStateDto {
    const state = this.getOrCreateState(session);

    if (state.flashMessages.length >= DEMO_SESSION_MAX_FLASH_MESSAGES) {
      throw new ConflictException(
        `A session can hold at most ${DEMO_SESSION_MAX_FLASH_MESSAGES} unread flash messages.`,
      );
    }

    state.flashMessages.push({
      id: randomUUID(),
      level: dto.level ?? 'info',
      message: dto.message,
      createdAt: new Date().toISOString(),
    });

    return this.toStateDto(state);
  }

  consumeFlashMessages(
    session: DemoExpressSession | undefined,
  ): DemoSessionFlashMessagesDto {
    const state = this.getOrCreateState(session);
    // AI modified: expose only the documented flash-message fields.
    const messages = state.flashMessages.map((message) => ({
      id: message.id,
      level: message.level,
      message: message.message,
      createdAt: message.createdAt,
    }));

    state.flashMessages = [];

    return {
      consumed: messages.length,
      messages,
    };
  }

  getCart(session: DemoExpressSession | undefined): DemoSessionCartItemDto[] {
    return this.getOrCreateState(session).cart.map((cartItem) => ({
      sku: cartItem.sku,
      ...(cartItem.name === undefined ? {} : { name: cartItem.name }),
      quantity: cartItem.quantity,
      addedAt: cartItem.addedAt,
      updatedAt: cartItem.updatedAt,
    }));
  }

  addCartItem(
    session: DemoExpressSession | undefined,
    dto: AddDemoSessionCartItemDto,
  ): DemoSessionStateDto {
    const state = this.getOrCreateState(session);
    const existingIndex = state.cart.findIndex((item) => item.sku === dto.sku);
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const existing = state.cart[existingIndex];
      const nextQuantity = existing.quantity + dto.quantity;

      if (nextQuantity > DEMO_SESSION_MAX_QUANTITY_PER_SKU) {
        throw new ConflictException(
          `A cart item quantity cannot exceed ${DEMO_SESSION_MAX_QUANTITY_PER_SKU}.`,
        );
      }

      state.cart[existingIndex] = {
        ...existing,
        name: dto.name ?? existing.name,
        quantity: nextQuantity,
        updatedAt: now,
      };

      return this.toStateDto(state);
    }

    if (state.cart.length >= DEMO_SESSION_MAX_CART_ITEMS) {
      throw new ConflictException(
        `A session cart can hold at most ${DEMO_SESSION_MAX_CART_ITEMS} distinct items.`,
      );
    }

    state.cart.push({
      sku: dto.sku,
      name: dto.name,
      quantity: dto.quantity,
      addedAt: now,
      updatedAt: now,
    });

    return this.toStateDto(state);
  }

  removeCartItem(
    session: DemoExpressSession | undefined,
    sku: string,
  ): DemoSessionStateDto {
    const state = this.getOrCreateState(session);

    state.cart = state.cart.filter((item) => item.sku !== sku);

    return this.toStateDto(state);
  }

  async logout(request: Request): Promise<DemoSessionStateDto> {
    const session = request.session;

    if (!session) {
      throw new ServiceUnavailableException(
        'Session middleware is not enabled.',
      );
    }

    await new Promise<void>((resolve, reject) => {
      session.destroy((error) => {
        if (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
          return;
        }

        resolve();
      });
    });

    return this.toStateDto(this.createInitialState());
  }

  private async regenerateSession(
    request: Request,
  ): Promise<DemoExpressSession> {
    const session = request.session;

    if (!session) {
      throw new ServiceUnavailableException(
        'Session middleware is not enabled.',
      );
    }

    await new Promise<void>((resolve, reject) => {
      session.regenerate((error) => {
        if (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
          return;
        }

        resolve();
      });
    });

    return request.session;
  }

  private getOrCreateState(
    session: DemoExpressSession | undefined,
  ): DemoSessionState {
    if (!session) {
      throw new ServiceUnavailableException(
        'Session middleware is not enabled.',
      );
    }

    session.demoSession ??= this.createInitialState();
    this.enforceSessionLimits(session.demoSession);

    return session.demoSession;
  }

  private enforceSessionLimits(state: DemoSessionState): void {
    // AI modified: bound pre-existing session records after upgrades before returning or extending them.
    if (state.flashMessages.length > DEMO_SESSION_MAX_FLASH_MESSAGES) {
      state.flashMessages = state.flashMessages.slice(
        -DEMO_SESSION_MAX_FLASH_MESSAGES,
      );
    }

    if (state.cart.length > DEMO_SESSION_MAX_CART_ITEMS) {
      state.cart = state.cart.slice(0, DEMO_SESSION_MAX_CART_ITEMS);
    }

    if (
      state.cart.some(
        (cartItem) => cartItem.quantity > DEMO_SESSION_MAX_QUANTITY_PER_SKU,
      )
    ) {
      state.cart = state.cart.map((cartItem) => ({
        ...cartItem,
        quantity: Math.min(
          cartItem.quantity,
          DEMO_SESSION_MAX_QUANTITY_PER_SKU,
        ),
      }));
    }
  }

  private copyAnonymousState(state: DemoSessionState): DemoSessionState {
    const anonymousState: DemoSessionState = {
      visits: state.visits,
      flashMessages: state.flashMessages.map((message) => ({ ...message })),
      cart: state.cart.map((cartItem) => ({ ...cartItem })),
    };

    this.enforceSessionLimits(anonymousState);

    return anonymousState;
  }

  private createInitialState(): DemoSessionState {
    return {
      visits: 0,
      flashMessages: [],
      cart: [],
    };
  }

  private toStateDto(state: DemoSessionState): DemoSessionStateDto {
    return {
      authenticated: state.user !== undefined,
      // AI modified: keep the public response isolated from future session-only fields.
      user:
        state.user === undefined
          ? null
          : {
              userId: state.user.userId,
              displayName: state.user.displayName,
              role: state.user.role,
              authenticatedAt: state.user.authenticatedAt,
            },
      visits: state.visits,
      flashMessages: state.flashMessages.map((message) => ({
        id: message.id,
        level: message.level,
        message: message.message,
        createdAt: message.createdAt,
      })),
      cart: state.cart.map((cartItem) => ({
        sku: cartItem.sku,
        ...(cartItem.name === undefined ? {} : { name: cartItem.name }),
        quantity: cartItem.quantity,
        addedAt: cartItem.addedAt,
        updatedAt: cartItem.updatedAt,
      })),
      cartItemCount: state.cart.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
    };
  }
}
