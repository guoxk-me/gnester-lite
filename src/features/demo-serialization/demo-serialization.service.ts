// CN: 服务，承载 demo-serialization 的业务逻辑；EN: Service holds business logic for demo-serialization.
import { Injectable } from '@nestjs/common';
import { DemoSerializationRoleDto } from './dto/demo-serialization-role.dto';
import { DemoSerializationUserDto } from './dto/demo-serialization-user.dto';

type PlainDemoSerializationUser = {
  readonly id: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly password: string;
  readonly role: DemoSerializationRoleDto;
  readonly auditTrail: string[];
  readonly _internalTraceId: string;
};

type PlainDemoSerializationPage = {
  readonly data: PlainDemoSerializationUser[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly _cacheKey: string;
};

@Injectable()
export class DemoSerializationService {
  // CN: 执行 demo-serialization 的 find profile 业务逻辑；EN: Runs the find profile business logic for demo-serialization.
  findProfile(): DemoSerializationUserDto {
    return new DemoSerializationUserDto(this.createPlainProfile());
  }

  // CN: 执行 demo-serialization 的 find admin profile 业务逻辑；EN: Runs the find admin profile business logic for demo-serialization.
  findAdminProfile(): DemoSerializationUserDto {
    return new DemoSerializationUserDto(this.createPlainProfile());
  }

  // CN: 执行 demo-serialization 的 find plain profile 业务逻辑；EN: Runs the find plain profile business logic for demo-serialization.
  findPlainProfile(): PlainDemoSerializationUser {
    return this.createPlainProfile();
  }

  // CN: 执行 demo-serialization 的 find plain page 业务逻辑；EN: Runs the find plain page business logic for demo-serialization.
  findPlainPage(): PlainDemoSerializationPage {
    return {
      data: [this.createPlainProfile()],
      total: 1,
      page: 1,
      limit: 10,
      _cacheKey: 'demo-serialization:users:page:1',
    };
  }

  // CN: 执行 demo-serialization 的 create plain profile 业务逻辑；EN: Runs the create plain profile business logic for demo-serialization.
  private createPlainProfile(): PlainDemoSerializationUser {
    return {
      id: 1,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'never-return-this',
      role: new DemoSerializationRoleDto({
        id: 10,
        name: 'maintainer',
        permissions: ['demo:read', 'demo:write'],
      }),
      auditTrail: ['created-by-seed', 'reviewed-by-admin'],
      _internalTraceId: 'trace-demo-serialization-001',
    };
  }
}
