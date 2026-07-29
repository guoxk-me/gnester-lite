import { createHash } from 'node:crypto';

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
  StreamableFile,
} from '@nestjs/common';
import { CACHE_TTL_METADATA } from '@nestjs/cache-manager';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, of, tap } from 'rxjs';

import { CacheService } from './cache.service';

const VARY_HEADERS = ['authorization', 'x-tenant-id'] as const;

type ResponseCacheTtlFactory = (
  context: ExecutionContext,
) => number | Promise<number>;
type ResponseCacheTtl = number | ResponseCacheTtlFactory;

@Injectable()
export class HttpCacheInterceptor {
  private readonly logger = new Logger(HttpCacheInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
    @Optional() private readonly httpAdapterHost?: HttpAdapterHost,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Promise<Observable<unknown>> {
    const key = this.trackBy(context);

    if (!key) {
      return next.handle();
    }

    try {
      const cachedResponse = await this.cacheService.get<unknown>(key);
      this.setCacheHeader(context, cachedResponse);

      if (cachedResponse !== undefined && cachedResponse !== null) {
        return of(cachedResponse);
      }
    } catch (error) {
      if (!(error instanceof ServiceUnavailableException)) {
        throw error;
      }

      // AI modified: response caching fails open after CacheService resets a stalled Redis transport.
      return next.handle();
    }

    const ttl = await this.getResponseTtl(context);

    return next.handle().pipe(
      tap((response) => {
        if (!(response instanceof StreamableFile)) {
          void this.cacheResponse(key, response, ttl);
        }
      }),
    );
  }

  protected trackBy(context: ExecutionContext): string | undefined {
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
      const headerValue = this.getHeader(request, header);

      return headerValue ? `${header}=${headerValue}` : undefined;
    }).filter(
      (headerValue): headerValue is string => headerValue !== undefined,
    );

    if (varyHeaders.length === 0) {
      return baseKey;
    }

    const varyHash = createHash('sha256')
      .update(varyHeaders.join('|'))
      .digest('hex');

    return `${baseKey}:vary:${varyHash}`;
  }

  private async cacheResponse(
    key: string,
    response: unknown,
    ttl: number | undefined,
  ): Promise<void> {
    try {
      await this.cacheService.set(key, response, ttl);
    } catch {
      // AI modified: cache-write diagnostics omit response bodies, URLs, and identity-derived keys.
      try {
        this.logger.warn('HTTP response cache write was skipped');
      } catch {
        // A cache or logger failure must not alter the completed HTTP response.
      }
    }
  }

  private async getResponseTtl(
    context: ExecutionContext,
  ): Promise<number | undefined> {
    const configuredTtl = this.reflector.get<ResponseCacheTtl | undefined>(
      CACHE_TTL_METADATA,
      context.getHandler(),
    );

    return typeof configuredTtl === 'function'
      ? configuredTtl(context)
      : configuredTtl;
  }

  private setCacheHeader(
    context: ExecutionContext,
    cachedResponse: unknown,
  ): void {
    const httpAdapter = this.httpAdapterHost?.httpAdapter;

    if (!httpAdapter) {
      return;
    }

    const response = context.switchToHttp().getResponse<unknown>();
    httpAdapter.setHeader(
      response,
      'X-Cache',
      cachedResponse === undefined || cachedResponse === null ? 'MISS' : 'HIT',
    );
  }

  private getHeader(request: Request, name: string): string | undefined {
    const headerValue = request.headers[name];

    return Array.isArray(headerValue) ? headerValue.join(',') : headerValue;
  }
}
