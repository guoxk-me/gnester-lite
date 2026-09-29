import { CallHandler, ExecutionContext, StreamableFile } from '@nestjs/common';
import { SSE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { Readable } from 'node:stream';

import {
  ApiEnvelopeBoundaryGuard,
  ApiEnvelopeInterceptor,
} from './api-envelope.interceptor.js';
import { SKIP_API_ENVELOPE_KEY } from './i18n.constants.js';

describe('ApiEnvelopeInterceptor', () => {
  const reflector = {
    getAllAndOverride: vi.fn(),
  };
  const interceptor = new ApiEnvelopeInterceptor(
    reflector as unknown as Reflector,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue(false);
  });

  it('wraps successful JSON payloads in the shared envelope', async () => {
    const response = {
      statusCode: 201,
      setHeader: vi.fn(),
      vary: vi.fn(),
    };
    const context = {
      getType: () => 'http',
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    const next = {
      handle: () => of({ id: 1 }),
    } as CallHandler;

    // AI modified: Vitest awaits the Observable directly instead of using deprecated done callbacks.
    const payload = await firstValueFrom(interceptor.intercept(context, next));
      expect(payload).toEqual({
        code: 201,
        message: 'Success',
        data: { id: 1 },
        errors: null,
      });
      expect(response.vary).toHaveBeenCalledWith('Accept-Language');
      expect(response.setHeader).toHaveBeenCalledWith('Content-Language', 'en');

  });

  it('skips wrapping when SkipApiEnvelope metadata is set', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === SKIP_API_ENVELOPE_KEY ? true : false,
    );
    const response = { statusCode: 200, locals: {} };
    const context = {
      getType: () => 'http',
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    const next = {
      handle: () => of({ status: 'ok' }),
    } as CallHandler;

    // AI modified: Vitest awaits the Observable directly instead of using deprecated done callbacks.
    const payload = await firstValueFrom(interceptor.intercept(context, next));
      expect(payload).toEqual({ status: 'ok' });
      expect(response.locals).toEqual({ [SKIP_API_ENVELOPE_KEY]: true });

  });

  it('marks native response routes before controller guards execute', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === SKIP_API_ENVELOPE_KEY ? true : false,
    );
    const response = { locals: {} };
    const context = {
      getType: () => 'http',
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    const guard = new ApiEnvelopeBoundaryGuard(
      reflector as unknown as Reflector,
    );

    expect(guard.canActivate(context)).toBe(true);
    expect(response.locals).toEqual({ [SKIP_API_ENVELOPE_KEY]: true });
  });

  it('does not wrap StreamableFile responses', async () => {
    const file = new StreamableFile(Readable.from(['demo']));
    const context = {
      getType: () => 'http',
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as unknown as ExecutionContext;
    const next = {
      handle: () => of(file),
    } as CallHandler;

    // AI modified: Vitest awaits the Observable directly instead of using deprecated done callbacks.
    const payload = await firstValueFrom(interceptor.intercept(context, next));
      expect(payload).toBe(file);

  });

  it('bypasses SSE handlers before mapping their emitted MessageEvent values', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === SSE_METADATA ? true : false,
    );
    const messageEvent = {
      type: 'heartbeat',
      data: { status: 'ok' },
    };
    const context = {
      getType: () => 'http',
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getResponse: () => ({ locals: {} }),
      }),
    } as unknown as ExecutionContext;
    const next = {
      handle: () => of(messageEvent),
    } as CallHandler;

    // AI modified: Vitest awaits the Observable directly instead of using deprecated done callbacks.
    const payload = await firstValueFrom(interceptor.intercept(context, next));
      expect(payload).toBe(messageEvent);

  });
});
