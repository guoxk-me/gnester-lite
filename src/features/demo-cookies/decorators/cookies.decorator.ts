// CN: 装饰器，标记 demo-cookies 的元数据；EN: Decorator marks metadata for demo-cookies.
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// CN: 从请求对象读取 Cookie 集合；EN: Reads the cookie collection from the request object.
export function getCookies(
  name: string | undefined,
  ctx: ExecutionContext,
): unknown {
  const request = ctx.switchToHttp().getRequest<{
    cookies?: Record<string, unknown>;
  }>();

  return name ? request.cookies?.[name] : request.cookies;
}

export const Cookies = createParamDecorator(getCookies);
