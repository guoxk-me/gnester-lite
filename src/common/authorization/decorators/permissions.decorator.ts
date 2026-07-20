// CN: 装饰器，标记 authorization common 的元数据；EN: Decorator marks metadata for authorization common.
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

// CN: 执行 authorization common 的 require permissions 逻辑；EN: Runs the require permissions logic for authorization common.
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
