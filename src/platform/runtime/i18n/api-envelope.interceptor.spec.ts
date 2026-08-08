import { CallHandler, ExecutionContext, StreamableFile } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { Readable } from 'node:stream';

import { ApiEnvelopeInterceptor } from './api-envelope.interceptor';
import { SKIP_API_ENVELOPE_KEY } from './i18n.constants';

describe('ApiEnvelopeInterceptor', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const interceptor = new ApiEnvelopeInterceptor(
    reflector as unknown as Reflector,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue(false);
  });

  it('wraps successful JSON payloads in the shared envelope', (done) => {
    const context = {
      getType: () => 'http',
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 201 }),
      }),
    } as unknown as ExecutionContext;
    const next = {
      handle: () => of({ id: 1 }),
    } as CallHandler;

    interceptor.intercept(context, next).subscribe((payload) => {
      expect(payload).toEqual({
        code: 201,
        message: 'Success',
        data: { id: 1 },
        errors: null,
      });
      done();
    });
  });

  it('skips wrapping when SkipApiEnvelope metadata is set', (done) => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === SKIP_API_ENVELOPE_KEY ? true : false,
    );
    const context = {
      getType: () => 'http',
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as unknown as ExecutionContext;
    const next = {
      handle: () => of({ status: 'ok' }),
    } as CallHandler;

    interceptor.intercept(context, next).subscribe((payload) => {
      expect(payload).toEqual({ status: 'ok' });
      done();
    });
  });

  it('does not wrap StreamableFile responses', (done) => {
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

    interceptor.intercept(context, next).subscribe((payload) => {
      expect(payload).toBe(file);
      done();
    });
  });
});
