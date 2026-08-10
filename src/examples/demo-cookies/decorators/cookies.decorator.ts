import { createParamDecorator, ExecutionContext } from '@nestjs/common';

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
