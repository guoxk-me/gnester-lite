// CN: 服务，承载 demo-session 的业务逻辑；EN: Service holds business logic for demo-session.
import { randomUUID } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { Request } from 'express';
import type { Session, SessionData } from 'express-session';

import { AddDemoSessionCartItemDto } from './dto/add-demo-session-cart-item.dto';
import { CreateDemoSessionFlashDto } from './dto/create-demo-session-flash.dto';
import { CreateDemoSessionLoginDto } from './dto/create-demo-session-login.dto';
import {
  DemoSessionFlashMessagesDto,
  DemoSessionStateDto,
} from './dto/demo-session-state.dto';
import { DemoSessionScenarioDto } from './dto/demo-session-scenario.dto';
import type {
  DemoSessionCartItem,
  DemoSessionState,
} from './demo-session.types';

export type DemoExpressSession = Session & Partial<SessionData>;

@Injectable()
export class DemoSessionService {
  // CN: 执行 demo-session 的 get scenarios 业务逻辑；EN: Runs the get scenarios business logic for demo-session.
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

  // CN: 执行 demo-session 的 get status 业务逻辑；EN: Runs the get status business logic for demo-session.
  getStatus(session: DemoExpressSession | undefined): DemoSessionStateDto {
    return this.toStateDto(this.getOrCreateState(session));
  }

  // CN: 执行 demo-session 的 login 业务逻辑；EN: Runs the login business logic for demo-session.
  login(
    session: DemoExpressSession | undefined,
    dto: CreateDemoSessionLoginDto,
  ): DemoSessionStateDto {
    const state = this.getOrCreateState(session);

    state.user = {
      userId: dto.userId,
      displayName: dto.displayName,
      role: dto.role ?? 'member',
      authenticatedAt: new Date().toISOString(),
    };

    return this.toStateDto(state);
  }

  // CN: 执行 demo-session 的 register visit 业务逻辑；EN: Runs the register visit business logic for demo-session.
  registerVisit(session: DemoExpressSession | undefined): DemoSessionStateDto {
    const state = this.getOrCreateState(session);

    state.visits += 1;

    return this.toStateDto(state);
  }

  // CN: 执行 demo-session 的 add flash message 业务逻辑；EN: Runs the add flash message business logic for demo-session.
  addFlashMessage(
    session: DemoExpressSession | undefined,
    dto: CreateDemoSessionFlashDto,
  ): DemoSessionStateDto {
    const state = this.getOrCreateState(session);

    state.flashMessages.push({
      id: randomUUID(),
      level: dto.level ?? 'info',
      message: dto.message,
      createdAt: new Date().toISOString(),
    });

    return this.toStateDto(state);
  }

  // CN: 执行 demo-session 的 consume flash messages 业务逻辑；EN: Runs the consume flash messages business logic for demo-session.
  consumeFlashMessages(
    session: DemoExpressSession | undefined,
  ): DemoSessionFlashMessagesDto {
    const state = this.getOrCreateState(session);
    const messages = [...state.flashMessages];

    state.flashMessages = [];

    return {
      consumed: messages.length,
      messages,
    };
  }

  // CN: 执行 demo-session 的 get cart 业务逻辑；EN: Runs the get cart business logic for demo-session.
  getCart(session: DemoExpressSession | undefined): DemoSessionCartItem[] {
    return [...this.getOrCreateState(session).cart];
  }

  // CN: 执行 demo-session 的 add cart item 业务逻辑；EN: Runs the add cart item business logic for demo-session.
  addCartItem(
    session: DemoExpressSession | undefined,
    dto: AddDemoSessionCartItemDto,
  ): DemoSessionStateDto {
    const state = this.getOrCreateState(session);
    const existingIndex = state.cart.findIndex((item) => item.sku === dto.sku);
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const existing = state.cart[existingIndex];
      state.cart[existingIndex] = {
        ...existing,
        name: dto.name ?? existing.name,
        quantity: existing.quantity + dto.quantity,
        updatedAt: now,
      };

      return this.toStateDto(state);
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

  // CN: 执行 demo-session 的 remove cart item 业务逻辑；EN: Runs the remove cart item business logic for demo-session.
  removeCartItem(
    session: DemoExpressSession | undefined,
    sku: string,
  ): DemoSessionStateDto {
    const state = this.getOrCreateState(session);

    state.cart = state.cart.filter((item) => item.sku !== sku);

    return this.toStateDto(state);
  }

  // CN: 执行 demo-session 的 logout 业务逻辑；EN: Runs the logout business logic for demo-session.
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

  // CN: 执行 demo-session 的 get or create state 业务逻辑；EN: Runs the get or create state business logic for demo-session.
  private getOrCreateState(
    session: DemoExpressSession | undefined,
  ): DemoSessionState {
    if (!session) {
      throw new ServiceUnavailableException(
        'Session middleware is not enabled.',
      );
    }

    session.demoSession ??= this.createInitialState();

    return session.demoSession;
  }

  // CN: 执行 demo-session 的 create initial state 业务逻辑；EN: Runs the create initial state business logic for demo-session.
  private createInitialState(): DemoSessionState {
    return {
      visits: 0,
      flashMessages: [],
      cart: [],
    };
  }

  // CN: 执行 demo-session 的 to state dto 业务逻辑；EN: Runs the to state dto business logic for demo-session.
  private toStateDto(state: DemoSessionState): DemoSessionStateDto {
    return {
      authenticated: state.user !== undefined,
      user: state.user ?? null,
      visits: state.visits,
      flashMessages: [...state.flashMessages],
      cart: [...state.cart],
      cartItemCount: state.cart.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
    };
  }
}
