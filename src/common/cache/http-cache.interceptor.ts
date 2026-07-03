// CN: 拦截器，调整 cache common 的请求或响应流程；EN: Interceptor adjusts request or response flow for cache common.
import { createHash } from 'node:crypto';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import type { Request } from 'express';

const VARY_HEADERS = ['authorization', 'x-tenant-id'] as const;

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  // CN: 拦截并整理 cache common 的 track by 响应流程；EN: Intercepts and shapes the track by response flow for cache common.
  protected override trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest<Request | undefined>();

    if (!request || request.method !== 'GET') {
      return undefined;
    }

    const url = request.originalUrl ?? request.url;

    if (!url) {
      return undefined;
    }

    const baseKey = `http:${request.method}:${url}`;
    const varyHeaders = VARY_HEADERS.map((header) => {
      const value = this.getHeader(request, header);

      return value ? `${header}=${value}` : undefined;
    }).filter((value): value is string => value !== undefined);

    if (varyHeaders.length === 0) {
      return baseKey;
    }

    const varyHash = createHash('sha256')
      .update(varyHeaders.join('|'))
      .digest('hex');

    return `${baseKey}:vary:${varyHash}`;
  }

  // CN: 拦截并整理 cache common 的 get header 响应流程；EN: Intercepts and shapes the get header response flow for cache common.
  private getHeader(request: Request, name: string): string | undefined {
    const value = request.headers[name];

    return Array.isArray(value) ? value.join(',') : value;
  }
}
