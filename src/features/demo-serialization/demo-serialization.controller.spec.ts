// CN: 测试文件，验证 demo-serialization 的行为契约；EN: Test file verifies behavior contracts for demo-serialization.
import {
  CallHandler,
  ClassSerializerInterceptor,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { DemoSerializationController } from './demo-serialization.controller';
import { DemoSerializationService } from './demo-serialization.service';

// CN: 测试分组：DemoSerializationController；EN: Test group: DemoSerializationController.
describe('DemoSerializationController', () => {
  let controller: DemoSerializationController;
  let interceptor: ClassSerializerInterceptor;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    controller = new DemoSerializationController(
      new DemoSerializationService(),
    );
    interceptor = new ClassSerializerInterceptor(new Reflector());
  });

  // CN: 准备或验证 demo-serialization 的 serialize 测试逻辑；EN: Prepares or verifies the serialize test logic for demo-serialization.
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
    } as ExecutionContext;
    const callHandler: CallHandler = {
      handle: () => of(controller[methodName]()),
    };

    return lastValueFrom(interceptor.intercept(context, callHandler));
  }

  // CN: 测试用例：serializes public profiles without sensitive or internal fields；EN: Test case: serializes public profiles without sensitive or internal fields.
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

  // CN: 测试用例：serializes admin-only fields when the admin group is selected；EN: Test case: serializes admin-only fields when the admin group is selected.
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

  // CN: 测试用例：transforms plain profile objects through the declared response type；EN: Test case: transforms plain profile objects through the declared response type.
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

  // CN: 测试用例：transforms nested plain arrays and excludes prefixed metadata；EN: Test case: transforms nested plain arrays and excludes prefixed metadata.
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
