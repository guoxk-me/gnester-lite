// CN: 装饰器，标记 auth common 的元数据；EN: Decorator marks metadata for auth common.
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// CN: 执行 auth common 的 public 逻辑；EN: Runs the public logic for auth common.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
