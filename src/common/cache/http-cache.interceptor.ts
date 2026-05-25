import { createHash } from 'node:crypto';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import type { Request } from 'express';

const VARY_HEADERS = ['authorization', 'x-tenant-id'] as const;

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
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

  private getHeader(request: Request, name: string): string | undefined {
    const value = request.headers[name];

    return Array.isArray(value) ? value.join(',') : value;
  }
}
