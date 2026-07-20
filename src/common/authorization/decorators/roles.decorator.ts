// CN: 装饰器，标记 authorization common 的元数据；EN: Decorator marks metadata for authorization common.
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// CN: 执行 authorization common 的 roles 逻辑；EN: Runs the roles logic for authorization common.
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
