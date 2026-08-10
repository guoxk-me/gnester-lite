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
  findProfile(): DemoSerializationUserDto {
    return new DemoSerializationUserDto(this.createPlainProfile());
  }

  findAdminProfile(): DemoSerializationUserDto {
    return new DemoSerializationUserDto(this.createPlainProfile());
  }

  findPlainProfile(): PlainDemoSerializationUser {
    return this.createPlainProfile();
  }

  findPlainPage(): PlainDemoSerializationPage {
    return {
      data: [this.createPlainProfile()],
      total: 1,
      page: 1,
      limit: 10,
      _cacheKey: 'demo-serialization:users:page:1',
    };
  }

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
