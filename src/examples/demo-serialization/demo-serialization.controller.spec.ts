import {
  CallHandler,
  ClassSerializerInterceptor,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { DemoSerializationController } from './demo-serialization.controller';
import { DemoSerializationService } from './demo-serialization.service';

describe('DemoSerializationController', () => {
  let controller: DemoSerializationController;
  let interceptor: ClassSerializerInterceptor;

  beforeEach(() => {
    controller = new DemoSerializationController(
      new DemoSerializationService(),
    );
    interceptor = new ClassSerializerInterceptor(new Reflector());
  });

  async function serialize(
    methodName: keyof DemoSerializationController,
  ): Promise<unknown> {
    const controllerPrototype = Object.getPrototypeOf(
      controller,
    ) as DemoSerializationController;
    const handler = controllerPrototype[methodName] as () => unknown;
    const context = {
      getHandler: () => handler,
      getClass: () => DemoSerializationController,
      getType: () => 'http',
    } as unknown as ExecutionContext;
    const callHandler: CallHandler = {
      handle: () => of(controller[methodName]()),
    };

    return lastValueFrom(interceptor.intercept(context, callHandler));
  }

  it('serializes public profiles without sensitive or internal fields', async () => {
    const body = await serialize('findProfile');

    expect(body).toEqual({
      id: 1,
      firstName: 'Ada',
      lastName: 'Lovelace',
      emailAddress: 'ada@example.com',
      role: 'maintainer',
      fullName: 'Ada Lovelace',
    });
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('_internalTraceId');
    expect(body).not.toHaveProperty('auditTrail');
  });

  it('serializes admin-only fields when the admin group is selected', async () => {
    const body = await serialize('findAdminProfile');

    expect(body).toEqual({
      id: 1,
      firstName: 'Ada',
      lastName: 'Lovelace',
      emailAddress: 'ada@example.com',
      role: 'maintainer',
      auditTrail: ['created-by-seed', 'reviewed-by-admin'],
      fullName: 'Ada Lovelace',
    });
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('_internalTraceId');
  });

  it('transforms plain profile objects through the declared response type', async () => {
    const body = await serialize('findPlainProfile');

    expect(body).toEqual({
      id: 1,
      firstName: 'Ada',
      lastName: 'Lovelace',
      emailAddress: 'ada@example.com',
      role: 'maintainer',
      fullName: 'Ada Lovelace',
    });
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('_internalTraceId');
  });

  it('transforms nested plain arrays and excludes prefixed metadata', async () => {
    const body = await serialize('findPlainPage');

    expect(body).toEqual({
      data: [
        {
          id: 1,
          firstName: 'Ada',
          lastName: 'Lovelace',
          emailAddress: 'ada@example.com',
          role: 'maintainer',
          fullName: 'Ada Lovelace',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    });
    expect(body).not.toHaveProperty('_cacheKey');
    const pageBody = body as { data: Record<string, unknown>[] };
    expect(pageBody.data[0]).not.toHaveProperty('password');
    expect(pageBody.data[0]).not.toHaveProperty('_internalTraceId');
  });
});
